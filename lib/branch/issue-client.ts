import type { BranchIssue } from "@/lib/branch/problems";

export async function patchIssue(id: string, body: Record<string, unknown>): Promise<BranchIssue> {
  const res = await fetch(`/api/branch/problems/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
  return data.issue as BranchIssue;
}

export type StaffOption = { id: string; full_name: string };

export type CampchefOption = {
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  email: string | null;
};

export async function fetchBranchStaffOptions(): Promise<StaffOption[]> {
  const res = await fetch("/api/branch/staff?active=true");
  if (!res.ok) return [];
  const data = (await res.json()) as { staff?: { id: string; full_name: string }[] };
  return (data.staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name }));
}

export async function fetchCampchefOptions(): Promise<CampchefOption[]> {
  const res = await fetch("/api/branch/campchefs");
  if (!res.ok) return [];
  const data = (await res.json()) as { campchefs?: CampchefOption[] };
  return data.campchefs ?? [];
}
