type ReportStatus = string;

const STATUS_PRIORITY: Record<string, number> = {
  reviewed: 5,
  submitted: 4,
  revision_required: 3,
  draft: 2,
};

function statusRank(status: ReportStatus): number {
  return STATUS_PRIORITY[status] ?? 1;
}

/** Keep one report per request_id — highest status wins, then latest updated_at. */
export function dedupeReportsByRequest<T extends { request_id: string; status: string; updated_at: string }>(
  reports: T[],
): T[] {
  const byRequest = new Map<string, T>();
  for (const report of reports) {
    const existing = byRequest.get(report.request_id);
    if (!existing) {
      byRequest.set(report.request_id, report);
      continue;
    }
    const existingRank = statusRank(existing.status);
    const nextRank = statusRank(report.status);
    if (
      nextRank > existingRank ||
      (nextRank === existingRank && report.updated_at > existing.updated_at)
    ) {
      byRequest.set(report.request_id, report);
    }
  }
  return [...byRequest.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}
