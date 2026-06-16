export type OpsTimeGroup = "morning" | "midday" | "evening";

export const OPS_TIME_GROUPS: { id: OpsTimeGroup; label: string; hint?: string }[] = [
  { id: "morning", label: "MORGEN" },
  { id: "midday", label: "TOTE FENSTER", hint: "10:30 – 14:00" },
  { id: "evening", label: "ABEND" },
];

export function isOpsTimeGroup(value: string): value is OpsTimeGroup {
  return value === "morning" || value === "midday" || value === "evening";
}

export function opsTimeGroupLabel(group: OpsTimeGroup): string {
  return OPS_TIME_GROUPS.find((g) => g.id === group)?.label ?? group;
}
