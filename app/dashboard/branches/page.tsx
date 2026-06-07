import Link from "next/link";

import { createServiceRoleClient } from "@/lib/supabase";

export default async function BranchesPage() {
  let branches: { id: string; name: string; location: string | null }[] = [];
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("branches").select("id, name, location").order("name");
    branches = data ?? [];
  } catch {
    /* env */
  }

  const cards = await Promise.all(
    branches.map(async (b) => {
      let manager = "—";
      let lastReport = "—";
      let occupancy: number | null = null;
      try {
        const supabase = createServiceRoleClient();
        const { data: mgr } = await supabase
          .from("users")
          .select("full_name, email")
          .eq("branch_id", b.id)
          .eq("role", "branch_manager")
          .limit(1)
          .maybeSingle();
        if (mgr) manager = mgr.full_name?.trim() || mgr.email;

        const { data: rep } = await supabase
          .from("reports")
          .select("submitted_at")
          .eq("branch_id", b.id)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (rep?.submitted_at) lastReport = new Date(rep.submitted_at).toLocaleDateString();

        const { data: kpi } = await supabase
          .from("kpis")
          .select("occupancy_rate")
          .eq("branch_id", b.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (kpi?.occupancy_rate != null) occupancy = Number(kpi.occupancy_rate);
      } catch {
        /* skip */
      }
      return { ...b, manager, lastReport, occupancy };
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Branches</h1>
        <p className="text-sm text-[#9ca3af]">To add a new branch, use the Super Admin panel.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((b) => (
          <article key={b.id} className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
            <h2 className="text-lg font-semibold text-white">{b.name}</h2>
            {b.location ? <p className="text-sm text-[#9ca3af]">{b.location}</p> : null}
            <dl className="mt-4 space-y-2 text-sm text-[#d1d5db]">
              <div>
                <dt className="text-xs text-[#6b7280]">Manager</dt>
                <dd>{b.manager}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6b7280]">Last report</dt>
                <dd>{b.lastReport}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#6b7280]">Occupancy</dt>
                <dd>{b.occupancy != null ? `${b.occupancy}%` : "—"}</dd>
              </div>
            </dl>
            <Link
              href={`/dashboard/branches/${b.id}`}
              className="mt-4 inline-flex rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5]"
            >
              Open
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
