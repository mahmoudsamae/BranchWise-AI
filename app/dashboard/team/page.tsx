import Link from "next/link";

import { isDemoSession } from "@/lib/demo/guard";
import { demoBranches } from "@/lib/demo/mock-data";
import { DEMO_BRANCH_IDS } from "@/lib/demo/config";
import { buildTeamRows, formatCampchefCount, type TeamMemberRow } from "@/lib/gm-hr/team-query";
import { getSessionUserServer } from "@/lib/session";
import { createServiceRoleClient } from "@/lib/supabase";

function demoTeamRows(): TeamMemberRow[] {
  const branches = demoBranches().branches.map((b) => ({
    id: b.id,
    name: b.name,
    location: b.location,
  }));

  return buildTeamRows(branches, [
    {
      id: "00000000-0000-4000-8000-000000000003",
      full_name: "Demo Branch Manager",
      email: "demo.branch@branchwise.demo",
      branch_id: DEMO_BRANCH_IDS.regensburg,
      is_active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000099",
      full_name: "Campchef Bodensee",
      email: "campchef.bodensee@branchwise.demo",
      branch_id: DEMO_BRANCH_IDS.bodensee,
      is_active: true,
    },
    {
      id: "00000000-0000-4000-8000-000000000098",
      full_name: "Stellv. Regensburg",
      email: "stellv.regensburg@branchwise.demo",
      branch_id: DEMO_BRANCH_IDS.regensburg,
      is_active: true,
    },
  ]);
}

function countByBranch(rows: TeamMemberRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.userId) continue;
    counts.set(row.branchId, (counts.get(row.branchId) ?? 0) + 1);
  }
  return counts;
}

export default async function DashboardTeamPage() {
  const session = await getSessionUserServer();
  let rows: TeamMemberRow[] = [];

  if (session && isDemoSession(session)) {
    rows = demoTeamRows();
  } else {
    try {
      const supabase = createServiceRoleClient();
      const { data: branches } = await supabase.from("branches").select("id, name, location").order("name");
      const branchIds = (branches ?? []).map((b) => b.id);

      let managers: {
        id: string;
        full_name: string | null;
        email: string | null;
        branch_id: string | null;
        is_active: boolean | null;
      }[] = [];

      if (branchIds.length > 0) {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, email, branch_id, is_active")
          .eq("role", "branch_manager")
          .in("branch_id", branchIds)
          .order("full_name");
        managers = data ?? [];
      }

      rows = buildTeamRows(
        (branches ?? []).map((b) => ({ id: b.id, name: b.name, location: b.location })),
        managers,
      );
    } catch {
      /* env */
    }
  }

  const countsByBranch = countByBranch(rows);
  const totalCampchefs = rows.filter((r) => r.userId).length;

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Team</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          {totalCampchefs} Campchefs · {countsByBranch.size} Campingplätze mit Ansprechpartner
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[#1f2937] bg-[#111827]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[#1f2937] text-[10px] uppercase tracking-wider text-[#6b7280]">
              <th className="px-5 py-3 font-medium">Campingplatz</th>
              <th className="px-5 py-3 font-medium">Campchef</th>
              <th className="px-5 py-3 font-medium">E-Mail</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[#9ca3af]">
                  Keine Filialen gefunden.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const prev = rows[index - 1];
                const showBranch = !prev || prev.branchId !== row.branchId;
                const campchefCount = countsByBranch.get(row.branchId) ?? 0;

                return (
                  <tr
                    key={row.userId ?? `${row.branchId}-empty`}
                    className="border-b border-[#1f2937]/60 text-[#e5e7eb] hover:bg-[#0f172a]/40"
                  >
                    <td className="px-5 py-3 align-top">
                      {showBranch ? (
                        <>
                          <p className="font-medium text-white">{row.branchName}</p>
                          {row.location ? <p className="text-xs text-[#6b7280]">{row.location}</p> : null}
                          {campchefCount > 1 ? (
                            <p className="mt-0.5 text-[10px] text-[#6b7280]">{formatCampchefCount(campchefCount)}</p>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">{row.managerName}</td>
                    <td className="px-5 py-3 text-[#9ca3af]">{row.email ?? "—"}</td>
                    <td className="px-5 py-3">
                      {row.userId ? (
                        <span
                          className={
                            row.isActive
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                              : "rounded-full bg-[#374151] px-2 py-0.5 text-[10px] font-medium text-[#9ca3af]"
                          }
                        >
                          {row.isActive ? "Aktiv" : "Inaktiv"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      {showBranch ? (
                        <Link
                          href={`/dashboard/branches/${row.branchId}`}
                          className="text-sm text-[#a5b4fc] hover:underline"
                        >
                          Filiale →
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
