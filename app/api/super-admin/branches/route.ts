import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from("branches").select("id, name, location").order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ branches: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let body: { name?: string; location?: string };
  try {
    body = (await request.json()) as { name?: string; location?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
  const location = String(body.location ?? "").trim() || null;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from("branches").insert({ name, location }).select("id, name, location").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ branch: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
