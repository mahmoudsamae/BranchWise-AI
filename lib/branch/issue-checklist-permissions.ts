import type { StageChecklists } from "@/lib/branch/issue-stage-data";

/** Stable fingerprint of section keys and task ids (ignores field edits). */
export function checklistStructureFingerprint(checklists: StageChecklists): string {
  const keys = Object.keys(checklists).sort((a, b) => Number(a) - Number(b));
  return keys
    .map((key) => {
      const ids = (checklists[key] ?? []).map((item) => item.id).join(",");
      return `${key}=[${ids}]`;
    })
    .join("|");
}

export function checklistStructureChanged(before: StageChecklists, after: StageChecklists): boolean {
  return checklistStructureFingerprint(before) !== checklistStructureFingerprint(after);
}
