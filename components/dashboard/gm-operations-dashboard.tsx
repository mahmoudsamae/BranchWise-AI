"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import type {
  AreaStatus,
  OperationsDashboardData,
  OperationsProject,
  RequestQueueItem,
} from "@/lib/gm-hr/operations-dashboard";

const DOT: Record<AreaStatus, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-[#4b5563]",
};

const SEGMENT: Record<AreaStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-red-500",
  gray: "bg-[#374151]",
};

const PROJECT_STATUS: Record<OperationsProject["status"], { badge: string; bar: string }> = {
  blocked: { badge: "bg-red-500/20 text-red-300 ring-red-500/40", bar: "bg-red-500" },
  waiting: { badge: "bg-amber-500/20 text-amber-300 ring-amber-500/40", bar: "bg-amber-400" },
  running: { badge: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40", bar: "bg-emerald-500" },
};

function StatusDot({ status }: { status: AreaStatus }) {
  return <span className={`inline-block size-2.5 rounded-full ${DOT[status]}`} title={status} />;
}

function CampScoreBar({ score, segments }: { score: number | null; segments: AreaStatus[] }) {
  return (
    <div className="flex min-w-[72px] flex-col gap-1">
      <span className="text-sm font-bold text-white">{score != null ? score : "—"}</span>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s, i) => (
          <span key={i} className={`h-full flex-1 ${SEGMENT[s]}`} />
        ))}
      </div>
    </div>
  );
}

const DECISION_LIST_PREVIEW = 5;

function MissingReportsCard({
  count,
  items,
  allClear,
}: {
  count: number;
  items: OperationsDashboardData["decisions"]["missing_reports"]["items"];
  allClear: boolean;
}) {
  const preview = items.slice(0, DECISION_LIST_PREVIEW);
  const more = items.length - preview.length;

  return (
    <article className="flex min-h-[220px] flex-col rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-300/90">Nicht gemeldet</p>
        <p className="text-4xl font-bold leading-none text-white">{count}</p>
      </div>

      {allClear ? (
        <p className="mt-4 text-sm text-emerald-300/90">Alle Filialen haben gemeldet.</p>
      ) : (
        <ul className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
          {preview.map((item) => (
            <li
              key={item.request_id}
              className="rounded-lg border border-red-500/15 bg-[#0a0f1e]/50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{item.branch_name}</span>
                <span className="shrink-0 text-xs font-semibold text-red-300">
                  {item.days_overdue} {item.days_overdue === 1 ? "Tag" : "Tage"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[#d1d5db]">{item.report_title}</p>
              <p className="mt-0.5 text-xs text-[#6b7280]">
                {item.period_label} · Fällig {formatDueDate(item.due_date)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {more > 0 ? (
        <p className="mt-2 text-xs text-[#9ca3af]">+ {more} weitere überfällige Berichte</p>
      ) : null}

      <div className="mt-auto pt-4">
        <Link href="/dashboard/reports">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-200 hover:bg-red-500/10"
          >
            Berichte öffnen
          </Button>
        </Link>
      </div>
    </article>
  );
}

function formatDueDate(ymd: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00`));
  } catch {
    return ymd;
  }
}

function SupportRequestsCard({
  count,
  items,
  allClear,
}: {
  count: number;
  items: OperationsDashboardData["decisions"]["support_requests"]["items"];
  allClear: boolean;
}) {
  return (
    <article className="flex min-h-[220px] flex-col rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 to-[#111827] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300/90">
          Support-Anfragen
        </p>
        <p className="text-4xl font-bold leading-none text-white">{count}</p>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#6b7280]">Von Campchefs</p>

      {allClear ? (
        <p className="mt-4 text-sm text-[#9ca3af]">Keine offenen Support-Anfragen.</p>
      ) : (
        <ul className="mt-4 max-h-44 space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-indigo-500/15 bg-[#0a0f1e]/50 px-3 py-2"
            >
              <p className="text-xs font-medium text-indigo-300/80">{item.branch_name}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-[#e5e7eb]">{item.title}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4">
        <Link href="/dashboard/reports">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10"
          >
            Anfragen prüfen
          </Button>
        </Link>
      </div>
    </article>
  );
}

function QueueBadge({ kind }: { kind: RequestQueueItem["kind"] }) {
  if (kind === "support") {
    return (
      <span className="shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-300">
        Support ↑
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
      Bericht
    </span>
  );
}

export function GmOperationsDashboard() {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/operations")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Laden fehlgeschlagen");
        return r.json();
      })
      .then((j: { operations: OperationsDashboardData }) => setData(j.operations))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-lg bg-[#1f2937]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 rounded-2xl bg-[#111827]" />
          <div className="h-36 rounded-2xl bg-[#111827]" />
        </div>
        <div className="h-64 rounded-2xl bg-[#111827]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {data.header.date_label} · {data.header.region_label} · {data.header.branch_count} Filialen
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
          Live-Daten
        </span>
      </header>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
          Erfordert Entscheidung
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <MissingReportsCard
            count={data.decisions.missing_reports.count}
            items={data.decisions.missing_reports.items}
            allClear={data.decisions.missing_reports.all_clear}
          />
          <SupportRequestsCard
            count={data.decisions.support_requests.count}
            items={data.decisions.support_requests.items}
            allClear={data.decisions.support_requests.all_clear}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1f2937] bg-[#111827]">
        <div className="border-b border-[#1f2937] px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Filialstatus</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#1f2937] text-[10px] uppercase tracking-wider text-[#6b7280]">
                <th className="px-4 py-3 font-medium">Filiale</th>
                <th className="px-3 py-3 font-medium">CampScore</th>
                <th className="px-2 py-3 text-center font-medium">Rezeption</th>
                <th className="px-2 py-3 text-center font-medium">Sanitärgebäude</th>
                <th className="px-2 py-3 text-center font-medium">Grünpflege</th>
                <th className="px-2 py-3 text-center font-medium">Bestellungen</th>
                <th className="px-2 py-3 text-center font-medium">Personal</th>
                <th className="px-2 py-3 text-center font-medium">Projekte</th>
                <th className="px-4 py-3 font-medium">Letzter Bericht</th>
              </tr>
            </thead>
            <tbody>
              {data.branch_status.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#9ca3af]">
                    Noch keine Filialdaten vorhanden.
                  </td>
                </tr>
              ) : (
                data.branch_status.map((row) => (
                  <tr key={row.branch_id} className="border-b border-[#1f2937]/60 text-[#e5e7eb] hover:bg-[#0f172a]/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/branches/${row.branch_id}`}
                        className="font-medium text-white hover:text-indigo-300"
                      >
                        {row.branch_name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <CampScoreBar score={row.camp_score} segments={row.score_segments} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.rezeption} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.sanitaer} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.gruenpflege} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.bestellungen} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.personal} />
                    </td>
                    <td className="px-2 py-3 text-center">
                      <StatusDot status={row.areas.projekte} />
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${row.last_report_overdue ? "font-medium text-red-400" : "text-[#9ca3af]"}`}
                    >
                      {row.last_report_label}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#1f2937] px-5 py-3 text-xs text-[#6b7280]">
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-400" /> OK
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" /> Beobachten
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-red-500" /> Problem
          </span>
          <span className="mr-3 inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#4b5563]" /> Keine Daten
          </span>
          · CampScore aus Berichten (Feedback · Einreichquote · Auslastung · Trend)
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">
            Projekte über alle Filialen
          </h2>
          {data.projects.length === 0 ? (
            <p className="mt-4 text-sm text-[#9ca3af]">Keine offenen Projekte.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.projects.map((p) => {
                const style = PROJECT_STATUS[p.status];
                return (
                  <li key={p.id} className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">
                          {p.title}
                          <span className="ml-2 text-sm font-normal text-[#9ca3af]">· {p.branch_name}</span>
                        </p>
                        {p.notes ? <p className="mt-0.5 text-xs text-[#6b7280]">{p.notes}</p> : null}
                      </div>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${style.badge}`}>
                        {p.status_label}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
                      <div className={`h-full rounded-full transition-all ${style.bar}`} style={{ width: `${p.progress}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#6b7280]">Anfragen-Queue</h2>
          {data.request_queue.length === 0 ? (
            <p className="mt-4 text-sm text-emerald-300/90">Keine offenen Anfragen — alles im grünen Bereich.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.request_queue.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 px-3 py-2.5"
                >
                  <QueueBadge kind={item.kind} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#9ca3af]">{item.branch_name}</p>
                    <p className="text-sm text-[#e5e7eb]">{item.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-[#4b5563]">
        Fokus: operative Steuerung · Umsatz und Auslastung sind in Analytics verfügbar
      </p>
    </div>
  );
}
