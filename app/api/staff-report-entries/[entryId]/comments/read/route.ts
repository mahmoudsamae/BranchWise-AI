import { NextResponse } from "next/server";

import { requireHrOrBranchManagerApi } from "@/lib/gm-hr/require-session";
import { markEntryNotificationsRead } from "@/lib/staff/discussion-notify";
import { canAccessStaffReportEntry, loadStaffReportEntry } from "@/lib/staff/report-entry-access";

type Ctx = { params: Promise<{ entryId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireHrOrBranchManagerApi();
  if (!auth.ok) return auth.response;

  const session = auth.session;

  const { entryId } = await ctx.params;

  try {
    const entry = await loadStaffReportEntry(entryId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessStaffReportEntry(entry, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await markEntryNotificationsRead(session.id, entryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST staff-report-entries comments/read]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
