export const REPORT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  revision_required: "Revision required",
};

export const REPORT_STATUS_CLASS: Record<string, string> = {
  draft: "bg-[#374151] text-[#d1d5db]",
  submitted: "bg-blue-500/20 text-blue-200",
  reviewed: "bg-emerald-500/20 text-emerald-200",
  revision_required: "bg-amber-500/20 text-amber-200",
};

export function reportStatusLabel(status: string): string {
  return REPORT_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export function reportStatusClass(status: string): string {
  return REPORT_STATUS_CLASS[status] ?? REPORT_STATUS_CLASS.draft!;
}
