import { NextResponse } from "next/server";
import React from "react";

import {
  generateWeeklyBranchSummaries,
  generateWeeklyHighlights,
} from "@/lib/exports/ai-content";
import { lastWeekRange } from "@/lib/exports/fetch-data";
import { loadBundle, parseDates, pdfResponse, type ExportBody } from "@/lib/exports/api-helpers";
import { renderPdfDocument } from "@/lib/exports/pdf/render";
import { WeeklyPackageDocument } from "@/lib/exports/pdf/weekly-document";
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

  const fallback = lastWeekRange();
  const range = parseDates(body, { start: fallback.start, end: fallback.end });

  try {
    const bundle = await loadBundle(auth.session, body, range);
    const [highlights, branchSummaries] = await Promise.all([
      generateWeeklyHighlights(bundle),
      generateWeeklyBranchSummaries(bundle),
    ]);

    const buffer = await renderPdfDocument(
      React.createElement(WeeklyPackageDocument, { bundle, highlights, branchSummaries }),
    );
    return pdfResponse(buffer, `weekly-package-${range.start_date}.pdf`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
