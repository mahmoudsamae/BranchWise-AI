import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";

export type BranchReportRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
  template_title: string | null;
};

function formatSubmitted(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function BranchReportsList({ reports }: { reports: BranchReportRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="bw-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <FileText className="size-10 text-[var(--text-muted)]" aria-hidden />
        <p className="mt-3 text-sm font-medium text-white">Noch keine Berichte</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Sobald die Filiale Berichte einreicht, erscheinen sie hier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <Link
          key={r.id}
          href={`/dashboard/reports/${r.id}`}
          className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)]/80 px-4 py-3 transition hover:border-[var(--accent)]/40 hover:bg-[var(--bg-elevated)]/40"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent-light)]">
            <FileText className="size-5" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-white group-hover:text-[var(--accent-light)]">
              {r.template_title ?? "Bericht"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Eingereicht: {formatSubmitted(r.submitted_at)}
            </p>
          </div>

          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${reportStatusClass(String(r.status))}`}
          >
            {reportStatusLabel(String(r.status))}
          </span>

          <ChevronRight
            className="size-4 shrink-0 text-[var(--text-muted)] transition group-hover:text-[var(--accent-light)]"
            aria-hidden
          />
        </Link>
      ))}
    </div>
  );
}
