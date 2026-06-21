export type TeamMemberRow = {
  branchId: string;
  branchName: string;
  location: string | null;
  userId: string | null;
  managerName: string;
  email: string | null;
  isActive: boolean;
};

type BranchRow = { id: string; name: string; location: string | null };
type ManagerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  branch_id: string | null;
  is_active?: boolean | null;
};

export function buildTeamRows(branches: BranchRow[], managers: ManagerRow[]): TeamMemberRow[] {
  const rows: TeamMemberRow[] = [];

  for (const branch of branches) {
    const branchManagers = managers
      .filter((m) => m.branch_id === branch.id)
      .sort((a, b) => (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "", "de"));

    if (branchManagers.length === 0) {
      rows.push({
        branchId: branch.id,
        branchName: branch.name,
        location: branch.location,
        userId: null,
        managerName: "—",
        email: null,
        isActive: false,
      });
      continue;
    }

    for (const mgr of branchManagers) {
      rows.push({
        branchId: branch.id,
        branchName: branch.name,
        location: branch.location,
        userId: mgr.id,
        managerName: mgr.full_name?.trim() || mgr.email || "Campchef",
        email: mgr.email ?? null,
        isActive: mgr.is_active !== false,
      });
    }
  }

  return rows;
}

/** Comma-separated Campchef names for branch overview cards. */
export function formatBranchManagerList(
  managers: { full_name: string | null; email: string | null; branch_id: string | null }[],
  branchId: string,
): string {
  const names = managers
    .filter((m) => m.branch_id === branchId)
    .sort((a, b) => (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? "", "de"))
    .map((m) => m.full_name?.trim() || m.email || "Campchef");
  return names.length > 0 ? names.join(", ") : "—";
}

export function formatCampchefCount(count: number): string {
  return count === 1 ? "1 Campchef" : `${count} Campchefs`;
}
