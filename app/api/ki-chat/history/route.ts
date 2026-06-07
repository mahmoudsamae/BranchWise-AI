import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("ki_chat_history")
      .select("id, role, content, context_mode, created_at")
      .eq("user_id", auth.session.id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ messages: [], warning: "Run migration 20260523000000_ki_chat_history" });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("ki_chat_history").delete().eq("user_id", auth.session.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
