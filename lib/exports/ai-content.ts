import { branchInsightLine } from "@/lib/exports/fetch-data";
import type { ExportBundle } from "@/lib/exports/types";
import type { BranchKpiRow } from "@/lib/gm-hr/analytics-service";
import { completeOpenAi } from "@/lib/exports/openai";

const EXPORT_SYSTEM_MSG = {
  role: "system" as const,
  content:
    "You are an operations analyst writing management export reports for AZUR Camping, a multi-branch hospitality company. " +
    "Rules: 1) Always name specific branches with exact figures. " +
    "2) Write in German unless the context clearly indicates English. " +
    "3) Be concise — no filler phrases. " +
    "4) Structure is more important than length.",
};

const AI_BRANCH_CAP = 10;

/** Top branches for per-branch OpenAI calls (cost guard on large portfolios). */
function branchesForAi(bundle: ExportBundle): BranchKpiRow[] {
  const sorted = [...bundle.by_branch].sort((a, b) => b.reports_submitted - a.reports_submitted);
  return sorted.length > AI_BRANCH_CAP ? sorted.slice(0, AI_BRANCH_CAP) : sorted;
}

function kpiJson(bundle: ExportBundle) {
  return JSON.stringify(
    bundle.by_branch.map((b) => ({
      branch: b.branch_name,
      occupancy: b.avg_occupancy,
      negative_feedback: b.total_negative_feedback,
      reports: b.reports_submitted,
      issues: b.repeated_issues,
    })),
    null,
    2,
  );
}

export async function generateExecutiveSummary(bundle: ExportBundle) {
  const text = await completeOpenAi(
    [
      {
        role: "system",
        content:
          "You write concise executive summaries for multi-branch hospitality operations. Use bullet-friendly paragraphs.",
      },
      {
        role: "user",
        content: `Based on this KPI data for ${bundle.start_date} to ${bundle.end_date}, write a 3-paragraph executive summary for management. Highlight top performers, critical issues, and actionable recommendations.\n\n${kpiJson(bundle)}`,
      },
    ],
    500,
  );

  const bullets = await completeOpenAi(
    [
      {
        role: "user",
        content: `List exactly 3 one-line key highlights (no numbering) from this data:\n${kpiJson(bundle)}`,
      },
    ],
    200,
  );

  const highlights = bullets
    .split("\n")
    .map((l) => l.replace(/^[-*•\d.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { executiveSummary: text, highlights: highlights.length ? highlights : ["Review branch KPI table for details."] };
}

export async function generateBranchInsights(bundle: ExportBundle) {
  const branches = branchesForAi(bundle);

  // Run per-branch OpenAI calls in parallel (not sequential) — capped to top 10 by revenue
  // so large deployments don't trigger runaway API cost or multi-minute export times.
  const results = await Promise.all(
    branches.map(async (b) => {
      const line = await completeOpenAi(
        [
          EXPORT_SYSTEM_MSG,
          {
            role: "user",
            content: `Write 1-2 sentences of operational insight for this branch: ${branchInsightLine(b)}`,
          },
        ],
        180,
      );
      return [b.branch_id, line] as const;
    }),
  );

  return Object.fromEntries(results);
}

export async function generateComparisonEvaluation(bundle: ExportBundle) {
  return completeOpenAi(
    [
      EXPORT_SYSTEM_MSG,
      {
        role: "user",
        content: `Compare these branches and explain which outperforms in occupancy and operations and where risks are. Be specific with branch names.\n\n${kpiJson(bundle)}`,
      },
    ],
    500,
  );
}

export async function generateWeeklyHighlights(bundle: ExportBundle) {
  return completeOpenAi(
    [
      EXPORT_SYSTEM_MSG,
      {
        role: "user",
        content: `Write weekly performance highlights (2-3 paragraphs) for period ${bundle.start_date} to ${bundle.end_date} across branches. Mention submission activity.\n\nReports count: ${bundle.reports.length}\n${kpiJson(bundle)}`,
      },
    ],
    500,
  );
}

export async function generateWeeklyBranchSummaries(bundle: ExportBundle) {
  const branches = branchesForAi(bundle);

  // Parallel OpenAI calls; same 10-branch revenue cap as generateBranchInsights().
  const results = await Promise.all(
    branches.map(async (b) => {
      const reps = bundle.reports.filter((r) => r.branch_id === b.branch_id);
      const summary = await completeOpenAi(
        [
          EXPORT_SYSTEM_MSG,
          {
            role: "user",
            content: `One short paragraph weekly summary for ${b.branch_name}. KPI: ${branchInsightLine(b)}. Reports submitted: ${reps.length}.`,
          },
        ],
        200,
      );
      return [b.branch_id, summary] as const;
    }),
  );

  return Object.fromEntries(results);
}
