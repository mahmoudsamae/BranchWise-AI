import { NextResponse } from "next/server";

import { loadBundle, parseDates, excelResponse, type ExportBody } from "@/lib/exports/api-helpers";
import { buildAnalyticsWorkbook } from "@/lib/exports/excel-builder";
import { lastFourWeeksRange } from "@/lib/exports/fetch-data";
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
  const includeCommunication = body.include?.communication === true;

  try {
    const bundle = await loadBundle(auth.session, body, range, includeCommunication);
    const buffer = buildAnalyticsWorkbook(bundle);
    return excelResponse(buffer, `analytics-export-${range.end_date}.xlsx`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Excel generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
