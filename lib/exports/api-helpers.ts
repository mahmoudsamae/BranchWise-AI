import { NextResponse } from "next/server";

import type { SessionPayload } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase";

import { fetchExportBundle } from "./fetch-data";
import type { ExportInclude } from "./types";

export type ExportBody = {
  start_date?: string;
  end_date?: string;
  week_start_date?: string;
  branch_ids?: string[];
  include?: ExportInclude;
};

export function parseDates(body: ExportBody, fallback: { start: string; end: string }) {
  const start = String(body.start_date ?? body.week_start_date ?? fallback.start).slice(0, 10);
  let end = String(body.end_date ?? fallback.end).slice(0, 10);
  if (body.week_start_date && !body.end_date) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 6);
    end = d.toISOString().slice(0, 10);
  }
  return { start_date: start, end_date: end };
}

export async function resolveBranchIds(branch_ids?: string[]) {
  const supabase = createServiceRoleClient();
  if (branch_ids?.length) return branch_ids;
  const { data } = await supabase.from("branches").select("id");
  return (data ?? []).map((b) => b.id as string);
}

export async function displayNameForUser(session: SessionPayload) {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("users").select("full_name, email").eq("id", session.id).maybeSingle();
  return (data?.full_name && String(data.full_name).trim()) || data?.email || session.email;
}

export async function loadBundle(
  session: SessionPayload,
  body: ExportBody,
  range: { start_date: string; end_date: string },
  includeCommunication = false,
) {
  const supabase = createServiceRoleClient();
  const branch_ids = await resolveBranchIds(body.branch_ids);
  const generated_by = await displayNameForUser(session);
  const hr_only = session.role === "hr";

  const bundle = await fetchExportBundle(supabase, {
    start_date: range.start_date,
    end_date: range.end_date,
    branch_ids,
    hr_only,
    generated_by,
    include_communication: includeCommunication,
  });

  return bundle;
}

export function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function excelResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
