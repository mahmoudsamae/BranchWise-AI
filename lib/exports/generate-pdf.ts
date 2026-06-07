import React from "react";

import { createServiceRoleClient } from "@/lib/supabase";

import {
  generateBranchInsights,
  generateComparisonEvaluation,
  generateExecutiveSummary,
  generateWeeklyBranchSummaries,
  generateWeeklyHighlights,
} from "./ai-content";
import { resolveBranchIds } from "./api-helpers";
import { fetchExportBundle, lastFourWeeksRange, lastWeekRange } from "./fetch-data";
import { ComparisonReportDocument } from "./pdf/comparison-document";
import { ManagementReportDocument } from "./pdf/management-document";
import { renderPdfDocument } from "./pdf/render";
import { WeeklyPackageDocument } from "./pdf/weekly-document";

export type ScheduledExportType = "weekly" | "management" | "comparison";

export type GenerateExportPdfOptions = {
  export_type: ScheduledExportType;
  branch_ids?: string[];
  hr_only: boolean;
  generated_by: string;
};

export type GenerateExportPdfResult = {
  buffer: Buffer;
  filename: string;
  start_date: string;
  end_date: string;
};

async function loadBundleDirect(opts: {
  branch_ids?: string[];
  range: { start_date: string; end_date: string };
  hr_only: boolean;
  generated_by: string;
}) {
  const supabase = createServiceRoleClient();
  const branch_ids = await resolveBranchIds(opts.branch_ids?.length ? opts.branch_ids : undefined);
  return fetchExportBundle(supabase, {
    start_date: opts.range.start_date,
    end_date: opts.range.end_date,
    branch_ids,
    hr_only: opts.hr_only,
    generated_by: opts.generated_by,
  });
}

export async function generateExportPdf(opts: GenerateExportPdfOptions): Promise<GenerateExportPdfResult> {
  const fallback = opts.export_type === "weekly" ? lastWeekRange() : lastFourWeeksRange();
  const range = { start_date: fallback.start, end_date: fallback.end };

  const bundle = await loadBundleDirect({
    branch_ids: opts.branch_ids,
    range,
    hr_only: opts.hr_only,
    generated_by: opts.generated_by,
  });

  if (opts.export_type === "weekly") {
    const [highlights, branchSummaries] = await Promise.all([
      generateWeeklyHighlights(bundle),
      generateWeeklyBranchSummaries(bundle),
    ]);
    const buffer = await renderPdfDocument(
      React.createElement(WeeklyPackageDocument, { bundle, highlights, branchSummaries }),
    );
    return { buffer, filename: `weekly-package-${range.start_date}.pdf`, ...range };
  }

  if (opts.export_type === "management") {
    const { executiveSummary, highlights } = await generateExecutiveSummary(bundle);
    const branchInsights = await generateBranchInsights(bundle);
    const buffer = await renderPdfDocument(
      React.createElement(ManagementReportDocument, {
        bundle,
        executiveSummary,
        highlights,
        branchInsights,
      }),
    );
    return { buffer, filename: `management-report-${range.end_date}.pdf`, ...range };
  }

  if (bundle.by_branch.length < 2) {
    throw new Error("Select at least two branches for comparison");
  }

  const evaluation = await generateComparisonEvaluation(bundle);
  const buffer = await renderPdfDocument(
    React.createElement(ComparisonReportDocument, { bundle, evaluation }),
  );
  return { buffer, filename: `branch-comparison-${range.end_date}.pdf`, ...range };
}
