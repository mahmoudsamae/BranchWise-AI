import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: user } = await supabase.from("users").select("full_name, email").eq("id", auth.session.id).maybeSingle();
    const { data: branch } = await supabase.from("branches").select("name").eq("id", bid).maybeSingle();

    return NextResponse.json({
      fullName: (user?.full_name && user.full_name.trim()) || user?.email || auth.session.email,
      email: user?.email ?? auth.session.email,
      branchId: bid,
      branchName: branch?.name ?? "Your branch",
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
