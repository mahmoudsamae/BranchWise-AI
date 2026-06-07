import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/user";
import { templateTypesForRole } from "@/lib/hr/role-scope";
import { getScopedRequestIds, getTemplateIdsForRole } from "@/lib/hr/requester-filter";

export type ReportListItem = {
  id: string;
  branch_id: string;
  branch_name: string;
  template_id: string;
  template_title: string;
  type: string;
  period_start: string | null;
  period_end: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string;
};

export async function listReports(
  supabase: SupabaseClient,
  params: {
    viewerRole: AppRole;
    type?: string | null;
    status?: string | null;
    branch_id?: string | null;
    start?: string | null;
    end?: string | null;
    search?: string | null;
    limit?: number;
    offset?: number;
  },
) {
  const limit = Math.min(params.limit ?? 50, 100);
  const offset = params.offset ?? 0;

  const scopedRequestIds = await getScopedRequestIds(supabase, params.viewerRole);
  if (scopedRequestIds.length === 0) {
    return { reports: [] as ReportListItem[], total: 0, stats: { total: 0, submitted: 0, draft: 0, reviewed: 0, revision_required: 0 } };
  }

  const templateIds = await getTemplateIdsForRole(supabase, params.viewerRole);
  const allowedTypes = templateTypesForRole(params.viewerRole);

  let q = supabase
    .from("reports")
    .select(
      "id, branch_id, template_id, status, submitted_at, updated_at, request_id, report_requests(period_start, period_end, requested_by)",
      { count: "exact" },
    )
    .in("request_id", scopedRequestIds)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.status) q = q.eq("status", params.status);
  if (params.branch_id) q = q.eq("branch_id", params.branch_id);
  if (templateIds.length > 0) q = q.in("template_id", templateIds);

  const { data: rows, error, count } = await q;
  if (error) throw new Error(error.message);

  const list = rows ?? [];
  const branchIds = [...new Set(list.map((r) => r.branch_id))];
  const templateIdsInRows = [...new Set(list.map((r) => r.template_id))];

  const { data: branches } =
    branchIds.length > 0 ? await supabase.from("branches").select("id, name").in("id", branchIds) : { data: [] };
  const { data: templates } =
    templateIdsInRows.length > 0
      ? await supabase.from("templates").select("id, title, type").in("id", templateIdsInRows)
      : { data: [] };

  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const tplMap = new Map((templates ?? []).map((t) => [t.id, { title: t.title, type: t.type }]));

  let reports: ReportListItem[] = list
    .filter((row) => {
      const tpl = tplMap.get(row.template_id as string);
      if (!allowedTypes || !tpl?.type) return false;
      return allowedTypes.includes(tpl.type);
    })
    .map((row) => {
    const rr = row.report_requests as { period_start?: string; period_end?: string } | null;
    const tpl = tplMap.get(row.template_id as string);
    return {
      id: row.id as string,
      branch_id: row.branch_id as string,
      branch_name: branchName.get(row.branch_id as string) ?? "—",
      template_id: row.template_id as string,
      template_title: tpl?.title ?? "—",
      type: tpl?.type ?? "standard",
      period_start: rr?.period_start ?? null,
      period_end: rr?.period_end ?? null,
      status: row.status as string,
      submitted_at: row.submitted_at as string | null,
      updated_at: row.updated_at as string,
    };
  });

  if (params.type) reports = reports.filter((r) => r.type === params.type);
  if (params.start) reports = reports.filter((r) => r.period_start && r.period_start >= params.start!);
  if (params.end) reports = reports.filter((r) => r.period_end && r.period_end <= params.end!);
  if (params.search) {
    const s = params.search.toLowerCase();
    reports = reports.filter(
      (r) => r.branch_name.toLowerCase().includes(s) || r.template_title.toLowerCase().includes(s),
    );
  }

  const stats = {
    total: count ?? reports.length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    draft: reports.filter((r) => r.status === "draft").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    revision_required: reports.filter((r) => r.status === "revision_required").length,
  };

  return { reports, total: count ?? reports.length, stats };
}
