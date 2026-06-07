import { createServiceRoleClient } from "@/lib/supabase";
import type { AppRole } from "@/types/user";

import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";

function roleLabel(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "general_manager":
      return "General Manager";
    case "hr":
      return "HR";
    case "branch_manager":
      return "Branch Manager";
    default:
      return role;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function SuperAdminDashboardPage() {
  let totalUsers = 0;
  let totalBranches = 0;
  let gmCount = 0;
  let bmCount = 0;
  let recent: {
    id: string;
    full_name: string | null;
    email: string;
    role: AppRole;
    created_at: string;
    is_active: boolean;
    branch_name: string | null;
  }[] = [];
  let error: string | null = null;

  try {
    const supabase = createServiceRoleClient();
    const [uc, bc, gmc, bmc, recentRows] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("branches").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "general_manager"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "branch_manager"),
      supabase
        .from("users")
        .select("id, full_name, email, role, branch_id, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    totalUsers = uc.count ?? 0;
    totalBranches = bc.count ?? 0;
    gmCount = gmc.count ?? 0;
    bmCount = bmc.count ?? 0;

    if (recentRows.error) {
      error = recentRows.error.message;
    } else {
      const rows = (recentRows.data ?? []) as {
        id: string;
        full_name: string | null;
        email: string;
        role: AppRole;
        branch_id: string | null;
        created_at: string;
        is_active: boolean;
      }[];
      const ids = [...new Set(rows.map((r) => r.branch_id).filter((x): x is string => Boolean(x)))];
      const names = new Map<string, string>();
      if (ids.length > 0) {
        const { data: brs } = await supabase.from("branches").select("id, name").in("id", ids);
        for (const b of brs ?? []) names.set(b.id as string, String(b.name));
      }
      recent = rows.map((r) => ({
        ...r,
        branch_name: r.branch_id ? (names.get(r.branch_id) ?? "—") : null,
      }));
    }
  } catch {
    error = "Could not load dashboard (check SUPABASE_SERVICE_ROLE_KEY and migrations).";
  }

  const statCards = [
    { label: "Total Users", value: totalUsers },
    { label: "Total Branches", value: totalBranches },
    { label: "General Managers", value: gmCount },
    { label: "Branch Managers", value: bmCount },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-[#f9fafb]">Dashboard</h1>
        <p className="mt-2 text-base text-[#9ca3af]">Overview of accounts and branches across the workspace.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{error}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-[#6366f1]/40"
          >
            <p className="text-sm font-medium text-[#9ca3af]">{c.label}</p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-[#f9fafb]">{c.value}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="text-xl font-semibold text-[#f9fafb]">Recent accounts</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">Last 10 users created.</p>
        <div className="mt-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell as="th">Full Name</TableCell>
                <TableCell as="th">Email</TableCell>
                <TableCell as="th">Role</TableCell>
                <TableCell as="th">Branch</TableCell>
                <TableCell as="th">Created</TableCell>
                <TableCell as="th">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#9ca3af]">
                    No users yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-[#f9fafb]">{u.full_name ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge tone={u.role}>{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-[#9ca3af]">{u.branch_name ?? "—"}</TableCell>
                    <TableCell className="text-[#9ca3af]">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <span className={u.is_active ? "text-[#10b981]" : "text-[#9ca3af]"}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
