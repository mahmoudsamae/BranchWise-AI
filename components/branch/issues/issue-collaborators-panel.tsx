"use client";

import { Plus, UserMinus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { fetchCampchefOptions, patchIssue, type CampchefOption } from "@/lib/branch/issue-client";
import type { BranchIssue } from "@/lib/branch/problems";
import type { IssueCollaborator } from "@/lib/branch/issue-types";

export function IssueCollaboratorsPanel({
  issue,
  onUpdated,
}: {
  issue: BranchIssue;
  onUpdated: (issue: BranchIssue) => void;
}) {
  const [campchefs, setCampchefs] = useState<CampchefOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canInvite = issue.canManage && issue.kind === "project";

  useEffect(() => {
    if (canInvite) void fetchCampchefOptions().then(setCampchefs);
  }, [canInvite]);

  async function persistCollaborators(next: IssueCollaborator[], detail?: string) {
    setSaving(true);
    setError(null);
    try {
      const updated = await patchIssue(issue.id, {
        collaborators: next,
        activityAction: "Campchef eingeladen",
        activityDetail: detail,
      });
      onUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  function invite(campchef: CampchefOption) {
    if (issue.collaborators.some((c) => c.userId === campchef.userId)) return;
    const next: IssueCollaborator = {
      id: crypto.randomUUID(),
      userId: campchef.userId,
      userName: campchef.userName,
      branchId: campchef.branchId,
      branchName: campchef.branchName,
      invitedAt: new Date().toISOString(),
    };
    void persistCollaborators([...issue.collaborators, next], campchef.userName);
  }

  function remove(userId: string) {
    const removed = issue.collaborators.find((c) => c.userId === userId);
    void persistCollaborators(
      issue.collaborators.filter((c) => c.userId !== userId),
      removed ? `${removed.userName} entfernt` : undefined,
    );
  }

  const available = campchefs.filter((c) => !issue.collaborators.some((x) => x.userId === c.userId));

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-[#9ca3af]" />
        <h3 className="text-sm font-semibold text-white">Campchefs zur Zusammenarbeit</h3>
      </div>

      {issue.sharedWithMe ? (
        <p className="mt-2 text-xs text-[#9ca3af]">
          Geteiltes Projekt von <span className="text-[#e5e7eb]">{issue.ownerBranchName}</span> — du kannst mitarbeiten.
        </p>
      ) : null}

      <ul className="mt-3 space-y-2">
        {issue.collaborators.length === 0 ? (
          <li className="text-xs text-[#6b7280]">Noch keine Campchefs eingeladen.</li>
        ) : (
          issue.collaborators.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#111827] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-[#f3f4f6]">{c.userName}</p>
                <p className="truncate text-[10px] text-[#6b7280]">{c.branchName}</p>
              </div>
              {canInvite ? (
                <button
                  type="button"
                  onClick={() => remove(c.userId)}
                  disabled={saving}
                  className="rounded p-1 text-[#6b7280] hover:bg-[#1f2937] hover:text-red-400"
                  aria-label={`${c.userName} entfernen`}
                >
                  <UserMinus className="size-4" />
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      {canInvite ? (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[#9ca3af]">Campchef einladen</label>
          <div className="flex items-center gap-2">
            <Plus className="size-3.5 shrink-0 text-[#6b7280]" />
            <select
              value=""
              disabled={saving || available.length === 0}
              onChange={(e) => {
                const picked = available.find((c) => c.userId === e.target.value);
                if (picked) invite(picked);
              }}
              className={cn(
                "min-w-0 flex-1 rounded-lg border border-[#374151] bg-[#111827] px-2 py-1.5 text-sm text-white",
                available.length === 0 && "opacity-60",
              )}
            >
              <option value="">{available.length === 0 ? "Keine weiteren Campchefs" : "Campchef wählen…"}</option>
              {available.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.userName} · {c.branchName}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      {saving ? <p className="mt-2 text-xs text-[#6b7280]">Speichern…</p> : null}
    </div>
  );
}
