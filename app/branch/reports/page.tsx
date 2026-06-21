"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";
import { daysUntilDue, urgencyForDueDate } from "@/lib/branch/urgency";

type Request = {
  id: string;
  title: string;
  request_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  template_title: string;
};

type Report = {
  id: string;
  request_id: string;
  status: string;
  submitted_at: string | null;
  request_title: string;
  request_type: string;
  period_start: string;
  period_end: string;
  due_date: string;
  template_title: string;
  template_type: string;
};

function formatDay(d: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(`${d}T00:00:00.000Z`));
  } catch {
    return d;
  }
}

function UrgencyBadge({ dueDate }: { dueDate: string }) {
  const u = urgencyForDueDate(dueDate);
  const days = daysUntilDue(dueDate);
  if (u === "overdue") {
    return <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-200">Überfällig</span>;
  }
  if (u === "today") {
    return <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-200">Heute fällig</span>;
  }
  return (
    <span className="rounded-full border border-[#374151] bg-[#111827] px-2 py-0.5 text-xs text-[#9ca3af]">
      Fällig in {days} Tag{days === 1 ? "" : "en"}
    </span>
  );
}

export default function BranchReportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"pending" | "submitted" | "all">("pending");
  const [requests, setRequests] = useState<Request[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch("/api/branch/requests"), fetch("/api/branch/reports")]);
      const d1 = (await r1.json()) as { requests?: Request[]; error?: string };
      const d2 = (await r2.json()) as { reports?: Report[]; error?: string };
      if (!r1.ok) showToast(d1.error ?? "Failed to load requests", "error");
      else setRequests(d1.requests ?? []);
      if (!r2.ok) showToast(d2.error ?? "Failed to load reports", "error");
      else setReports(d2.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("toast") === "submitted") {
      showToast("Report submitted successfully", "success");
      p.delete("toast");
      const q = p.toString();
      window.history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
    }
  }, [showToast]);

  const repByRequest = useMemo(() => {
    const m = new Map<string, Report>();
    for (const r of reports) m.set(r.request_id, r);
    return m;
  }, [reports]);

  const pendingCards = useMemo(() => {
    return requests.map((req) => {
      const rep = repByRequest.get(req.id);
      const open = !rep || rep.status === "draft" || rep.status === "revision_required";
      if (!open) return null;
      return { req, rep };
    }).filter(Boolean) as { req: Request; rep?: Report }[];
  }, [requests, repByRequest]);

  const submittedCards = useMemo(() => {
    const seen = new Set<string>();
    return reports.filter((r) => {
      if (r.status !== "submitted") return false;
      if (seen.has(r.request_id)) return false;
      seen.add(r.request_id);
      return true;
    });
  }, [reports]);

  const allCards = useMemo(() => {
    const items: { key: string; req: Request; rep?: Report; synthetic?: boolean }[] = [];
    for (const req of requests) {
      const rep = repByRequest.get(req.id);
      items.push({ key: req.id, req, rep });
    }
    for (const rep of reports) {
      if (!requests.some((q) => q.id === rep.request_id)) {
        items.push({
          key: rep.id,
          req: {
            id: rep.request_id,
            title: rep.request_title,
            request_type: rep.request_type,
            period_start: rep.period_start,
            period_end: rep.period_end,
            due_date: rep.due_date,
            template_title: rep.template_title,
          },
          rep,
          synthetic: true,
        });
      }
    }
    return items;
  }, [requests, reports, repByRequest]);

  function renderCard(req: Request, rep?: Report) {
    const status = rep?.status ?? "pending";
    const href = `/branch/reports/${req.id}`;
    const isSubmitted = status === "submitted";
    const isRevision = status === "revision_required";
    return (
      <div
        key={req.id}
        className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5 transition hover:border-[#6366f1]/40 hover:scale-[1.01]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-[#f9fafb]">{req.template_title || req.title}</p>
            <p className="mt-2 inline-flex rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-200">
              {req.request_type}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-semibold",
              isRevision
                ? reportStatusClass("revision_required")
                : isSubmitted
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-200",
            )}
          >
            {isRevision ? reportStatusLabel("revision_required") : isSubmitted ? "Submitted" : "Draft / open"}
          </span>
        </div>
        <p className="mt-3 text-sm text-[#9ca3af]">
          Period: {formatDay(req.period_start)} → {formatDay(req.period_end)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#9ca3af]">Due {formatDay(req.due_date)}</span>
          <UrgencyBadge dueDate={req.due_date} />
        </div>
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4f46e5]"
          >
            {isRevision ? "Revise & resubmit" : isSubmitted ? "View" : "Fill / View"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#f9fafb]">Meine Berichte</h1>
        <p className="mt-2 text-base text-[#9ca3af]">Entwürfe bearbeiten und eingereichte Berichte einsehen.</p>
      </div>

      <div className="flex gap-2 border-b border-[#1f2937]">
        {(["pending", "submitted", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-semibold capitalize transition",
              tab === t ? "border-[#6366f1] text-white" : "border-transparent text-[#9ca3af] hover:text-[#e5e7eb]",
            )}
          >
            {t === "pending" ? "Ausstehend" : t === "submitted" ? "Eingereicht" : "Alle"}
          </button>
        ))}
      </div>

      {loading ? <p className="text-[#9ca3af]">Wird geladen…</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {tab === "pending" &&
          pendingCards.map(({ req, rep }) => (
            <div key={req.id}>{renderCard(req, rep)}</div>
          ))}
        {tab === "submitted" &&
          submittedCards.map((rep) =>
            renderCard(
              {
                id: rep.request_id,
                title: rep.request_title,
                request_type: rep.request_type,
                period_start: rep.period_start,
                period_end: rep.period_end,
                due_date: rep.due_date,
                template_title: rep.template_title,
              },
              rep,
            ),
          )}
        {tab === "all" &&
          allCards.map(({ key, req, rep }) => <div key={key}>{renderCard(req, rep)}</div>)}
      </div>

      {!loading && tab === "pending" && pendingCards.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">Keine ausstehenden Berichte.</p>
      ) : null}
      {!loading && tab === "submitted" && submittedCards.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">Noch keine eingereichten Berichte.</p>
      ) : null}
    </div>
  );
}
