import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { parseOpsColumns } from "@/lib/branch-ops/columns";
import { isOpsTimeGroup } from "@/lib/branch-ops/time-groups";
import { publicOpsUrl } from "@/lib/email/app-url";
import { generateFormToken } from "@/lib/company-forms/token";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const branchId = auth.session.branch_id;

    let { data: tokenRow } = await supabase
      .from("branch_ops_tokens")
      .select("token, is_active")
      .eq("branch_id", branchId)
      .maybeSingle();

    if (!tokenRow) {
      const token = generateFormToken();
      const { data: created, error } = await supabase
        .from("branch_ops_tokens")
        .insert({ branch_id: branchId, token })
        .select("token, is_active")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      tokenRow = created;
    }

    const { data: tables, error: tablesError } = await supabase
      .from("branch_ops_tables")
      .select("id, name, table_type, columns, sort_order, is_active, created_at, updated_at")
      .eq("branch_id", branchId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (tablesError) return NextResponse.json({ error: tablesError.message }, { status: 500 });

    const dailyTableIds = (tables ?? []).filter((t) => t.table_type === "daily").map((t) => t.id);
    const dailyItemsByTable = new Map<
      string,
      { id: string; label: string; time_hint: string | null; time_group: string; sort_order: number }[]
    >();
    if (dailyTableIds.length > 0) {
      const { data: dailyItems } = await supabase
        .from("branch_ops_daily_items")
        .select("id, table_id, label, time_hint, time_group, sort_order")
        .in("table_id", dailyTableIds)
        .eq("is_active", true)
        .order("sort_order");
      for (const item of dailyItems ?? []) {
        const list = dailyItemsByTable.get(item.table_id) ?? [];
        list.push(item);
        dailyItemsByTable.set(item.table_id, list);
      }
    }

    return NextResponse.json({
      ops_link: publicOpsUrl(tokenRow.token, request),
      token: tokenRow.token,
      tables: (tables ?? []).map((t) => ({
        ...t,
        daily_items: t.table_type === "daily" ? dailyItemsByTable.get(t.id) ?? [] : undefined,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: {
    name?: string;
    table_type?: string;
    columns?: unknown;
    daily_items?: string[] | { label: string; time_hint?: string; time_group?: string }[];
    preset?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const tableType = body.table_type === "daily" ? "daily" : "log";
  if (!name) return NextResponse.json({ error: "Table name is required" }, { status: 400 });

  const columnsParsed = parseOpsColumns(body.columns ?? []);
  if (!columnsParsed.success && tableType === "log") {
    return NextResponse.json({ error: "Invalid columns" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const branchId = auth.session.branch_id;

    const { count } = await supabase
      .from("branch_ops_tables")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId);

    const { data: table, error } = await supabase
      .from("branch_ops_tables")
      .insert({
        branch_id: branchId,
        name,
        table_type: tableType,
        columns: asJson(tableType === "log" ? (columnsParsed.success ? columnsParsed.data : []) : []),
        sort_order: count ?? 0,
        created_by: auth.session.id,
        updated_at: new Date().toISOString(),
      })
      .select("id, name, table_type, columns, sort_order, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    if (tableType === "daily" && Array.isArray(body.daily_items)) {
      const items = body.daily_items
        .map((entry, i) => {
          if (typeof entry === "string") {
            const label = entry.trim();
            return label ? { table_id: table.id, label, sort_order: i, time_group: "morning" as const } : null;
          }
          const label = String(entry.label ?? "").trim();
          if (!label) return null;
          const group = entry.time_group && isOpsTimeGroup(entry.time_group) ? entry.time_group : "morning";
          return {
            table_id: table.id,
            label,
            time_hint: entry.time_hint ? String(entry.time_hint).trim() : null,
            time_group: group,
            sort_order: i,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
      if (items.length > 0) {
        await supabase.from("branch_ops_daily_items").insert(items);
      }
    }

    return NextResponse.json({ table });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
