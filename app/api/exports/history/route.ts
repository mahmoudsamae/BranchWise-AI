import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

const createHistorySchema = z.object({
  export_type: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  branches: z.string().optional(),
  format: z.string().optional(),
});

function mapHistoryRow(row: {
  id: string;
  export_type: string;
  start_date: string | null;
  end_date: string | null;
  branches: string | null;
  format: string;
  generated_at: string;
}) {
  return {
    id: row.id,
    type: row.export_type,
    start_date: row.start_date ?? "",
    end_date: row.end_date ?? "",
    branches: row.branches ?? "",
    format: row.format,
    generated_at: row.generated_at,
  };
}

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("export_history")
      .select("id, export_type, start_date, end_date, branches, format, generated_at")
      .eq("user_id", auth.session.id)
      .order("generated_at", { ascending: false })
      .limit(20);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for export_history" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: (data ?? []).map(mapHistoryRow) });
  } catch (e) {
    console.error("[GET /api/exports/history]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(createHistorySchema, raw);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("export_history")
      .insert({
        user_id: auth.session.id,
        export_type: body.export_type?.trim() || "Export",
        start_date: body.start_date ?? null,
        end_date: body.end_date ?? null,
        branches: body.branches ?? null,
        format: body.format?.trim() || "pdf",
      })
      .select("id, export_type, start_date, end_date, branches, format, generated_at")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for export_history" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data.id, entry: mapHistoryRow(data) });
  } catch (e) {
    console.error("[POST /api/exports/history]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
