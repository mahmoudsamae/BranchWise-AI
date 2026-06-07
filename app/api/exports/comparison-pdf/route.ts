import { NextResponse } from "next/server";
import React from "react";

import { generateComparisonEvaluation } from "@/lib/exports/ai-content";
import { lastFourWeeksRange } from "@/lib/exports/fetch-data";
import { loadBundle, parseDates, pdfResponse, type ExportBody } from "@/lib/exports/api-helpers";
import { ComparisonReportDocument } from "@/lib/exports/pdf/comparison-document";
import { renderPdfDocument } from "@/lib/exports/pdf/render";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let body: ExportBody = {};
  try {
    body = (await request.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fallback = lastFourWeeksRange();
  const range = parseDates(body, { start: fallback.start, end: fallback.end });

  try {
    const bundle = await loadBundle(auth.session, body, range);
    if (bundle.by_branch.length < 2) {
      return NextResponse.json({ error: "Select at least two branches for comparison" }, { status: 400 });
    }
    const evaluation = await generateComparisonEvaluation(bundle);
    const buffer = await renderPdfDocument(
      React.createElement(ComparisonReportDocument, { bundle, evaluation }),
    );
    return pdfResponse(buffer, `branch-comparison-${range.end_date}.pdf`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
