"use client";

import { Check, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IssueStageTracker } from "@/components/branch/issues/issue-stage-tracker";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { checklistStats, stageStatus, type StageChecklistItem } from "@/lib/branch/issue-stage-data";
import { defaultStagesFor, type BranchIssue } from "@/lib/branch/problems";

type FilterKind = "all" | "problem" | "project";
type StatusFilter = "open" | "done";

function KindBadge({ kind }: { kind: BranchIssue["kind"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        kind === "problem" ? "bg-red-500/15 text-red-300" : "bg-indigo-500/15 text-indigo-300",
      )}
    >
      {kind === "problem" ? "Problem" : "Projekt"}
    </span>
  );
}

function NewIssueForm({ onCreated, onCancel }: { onCreated: (issue: BranchIssue) => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"problem" | "project">("problem");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/branch/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: title.trim(), stages: defaultStagesFor(kind) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erstellen fehlgeschlagen");
      onCreated(data.issue);
      setTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erstellen fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-4">
      <p className="text-sm font-medium text-white">Neu anlegen</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "problem" | "project")}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb]"
        >
          <option value="problem">Problem</option>
          <option value="project">Projekt</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel…"
          className="min-w-[200px] flex-1 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb]"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || !title.trim()}
          className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Anlegen"}
        </button>
      </div>
    </div>
  );
}

function IssueDetailPanel({
  issue,
  onUpdated,
  onCompleted,
}: {
  issue: BranchIssue;
  onUpdated: (issue: BranchIssue) => void;
  onCompleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [selectedStage, setSelectedStage] = useState(issue.currentStage);
  const [noteDraft, setNoteDraft] = useState(issue.stageNotes[String(issue.currentStage)] ?? "");
  const [checklists, setChecklists] = useState(issue.stageChecklists);
  const [generalNotes, setGeneralNotes] = useState(issue.notes ?? "");
  const [costEstimate, setCostEstimate] = useState(issue.costEstimate?.toString() ?? "");
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    setSelectedStage(issue.currentStage);
    setNoteDraft(issue.stageNotes[String(issue.currentStage)] ?? "");
    setChecklists(issue.stageChecklists);
    setGeneralNotes(issue.notes ?? "");
    setCostEstimate(issue.costEstimate?.toString() ?? "");
  }, [issue]);

  useEffect(() => {
    setNoteDraft(issue.stageNotes[String(selectedStage)] ?? "");
  }, [selectedStage, issue.stageNotes]);

  const stageKey = String(selectedStage);
  const checklist = checklists[stageKey] ?? [];
  const stats = checklistStats(checklist);
  const status = stageStatus(selectedStage, issue.currentStage);
  const stageLabel = issue.stages[selectedStage] ?? "";

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/branch/problems/${issue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
        onUpdated(data.issue);
        return data.issue as BranchIssue;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [issue.id, onUpdated, toast],
  );

  async function saveNote() {
    const trimmed = noteDraft.trim();
    const prev = issue.stageNotes[stageKey] ?? "";
    if (trimmed === prev) return;
    const nextNotes = { ...issue.stageNotes, [stageKey]: trimmed };
    if (!trimmed) delete nextNotes[stageKey];
    await patch({ stageNotes: nextNotes });
  }

  async function saveChecklists(next: typeof checklists) {
    setChecklists(next);
    await patch({ stageChecklists: next });
  }

  async function toggleTask(itemId: string) {
    const nextList = checklist.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
    await saveChecklists({ ...checklists, [stageKey]: nextList });
  }

  async function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const item: StageChecklistItem = { id: crypto.randomUUID(), text, done: false };
    await saveChecklists({ ...checklists, [stageKey]: [...checklist, item] });
    setNewTask("");
  }

  async function removeTask(itemId: string) {
    await saveChecklists({ ...checklists, [stageKey]: checklist.filter((i) => i.id !== itemId) });
  }

  async function saveMeta() {
    await patch({
      notes: generalNotes.trim() || null,
      costEstimate: costEstimate.trim() ? Number(costEstimate) : null,
    });
  }

  async function advanceStage() {
    if (status !== "current") return;
    const openTasks = checklist.filter((i) => !i.done);
    if (openTasks.length > 0) {
      const ok = window.confirm(`${openTasks.length} offene Aufgabe(n) in dieser Phase. Trotzdem weiter?`);
      if (!ok) return;
    }
    setAdvancing(true);
    try {
      const nextStage = Math.min(issue.currentStage + 1, issue.stages.length - 1);
      const willComplete = issue.currentStage + 1 >= issue.stages.length;
      const res = await fetch(`/api/branch/problems/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: nextStage, status: willComplete ? "done" : "open" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update fehlgeschlagen");
      if (willComplete) {
        onCompleted(issue.id);
        onUpdated(data.issue);
        toast.success(`${issue.title} abgeschlossen`);
      } else {
        onUpdated(data.issue);
        setSelectedStage(nextStage);
        toast.success(`Phase: ${issue.stages[nextStage]}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update fehlgeschlagen");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <KindBadge kind={issue.kind} />
          <h2 className="mt-2 text-xl font-semibold text-white">{issue.title}</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Phase {issue.currentStage + 1} von {issue.stages.length}:{" "}
            <span className="text-amber-300">{issue.stages[issue.currentStage]}</span>
          </p>
        </div>
        {issue.status === "open" && status === "current" ? (
          <button
            type="button"
            disabled={advancing}
            onClick={() => void advanceStage()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-50"
          >
            {advancing ? <Loader2 className="size-4 animate-spin" /> : null}
            {issue.currentStage + 1 >= issue.stages.length ? "Abschließen" : "Nächste Phase"}
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>

      <IssueStageTracker
        stages={issue.stages}
        currentStage={issue.currentStage}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
      />

      <div className="mt-5 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            {selectedStage + 1}. {stageLabel}
          </h3>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase",
              status === "done" && "bg-indigo-500/20 text-indigo-300",
              status === "current" && "bg-amber-500/20 text-amber-300",
              status === "upcoming" && "bg-[#374151] text-[#9ca3af]",
            )}
          >
            {status === "done" ? "Erledigt" : status === "current" ? "Aktuell" : "Geplant"}
          </span>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-[#9ca3af]">Was ist passiert? / Notiz</span>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => void saveNote()}
            rows={3}
            placeholder="Kurz dokumentieren: Anruf, Angebot, Entscheidung…"
            className="mt-1.5 w-full resize-none rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb] placeholder:text-[#6b7280] focus:border-indigo-500/50 focus:outline-none"
          />
        </label>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[#9ca3af]">
              Aufgaben in dieser Phase
              {stats.total > 0 ? (
                <span className="ml-2 text-[#6b7280]">
                  {stats.done}/{stats.total} erledigt
                </span>
              ) : null}
            </p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#111827] px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => void toggleTask(item.id)}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border transition",
                    item.done ? "border-indigo-500 bg-indigo-500 text-white" : "border-[#374151] text-transparent hover:border-indigo-400",
                  )}
                  aria-label={item.done ? "Als offen markieren" : "Als erledigt markieren"}
                >
                  <Check className="size-3" />
                </button>
                <span className={cn("flex-1 text-sm", item.done ? "text-[#6b7280] line-through" : "text-[#e5e7eb]")}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => void removeTask(item.id)}
                  className="rounded p-1 text-[#6b7280] hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Aufgabe entfernen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Neue Aufgabe…"
              className="min-w-0 flex-1 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-1.5 text-sm text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addTask();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void addTask()}
              className="rounded-lg border border-[#374151] px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm text-[#9ca3af]">
          Kostenschätzung (€)
          <input
            type="number"
            min={0}
            step={0.01}
            value={costEstimate}
            onChange={(e) => setCostEstimate(e.target.value)}
            onBlur={() => void saveMeta()}
            className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-[#9ca3af] md:col-span-1">
          Allgemeine Notizen
          <textarea
            rows={2}
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            onBlur={() => void saveMeta()}
            className="mt-1 w-full resize-none rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
          />
        </label>
      </div>

      {saving ? <p className="mt-2 text-xs text-[#6b7280]">Speichern…</p> : null}
    </div>
  );
}

export function BranchIssuesHub({ initialIssues }: { initialIssues: BranchIssue[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");

  const [issues, setIssues] = useState(initialIssues);
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(issueParam);

  useEffect(() => {
    if (issueParam) setSelectedId(issueParam);
  }, [issueParam]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (i.status !== statusFilter) return false;
      if (kindFilter === "all") return true;
      return i.kind === kindFilter;
    });
  }, [issues, kindFilter, statusFilter]);

  const selected = issues.find((i) => i.id === selectedId) ?? null;

  function selectIssue(id: string) {
    setSelectedId(id);
    router.replace(`/branch/projects?issue=${id}`, { scroll: false });
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/branch" className="text-sm text-[#a5b4fc] hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Projekte & Probleme</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Jede Phase dokumentieren: Notizen, Aufgaben, Kosten — Schritt für Schritt bis zur Lösung.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5]"
        >
          <Plus className="size-4" /> Neu
        </button>
      </div>

      {showForm ? (
        <NewIssueForm
          onCreated={(issue) => {
            setIssues((prev) => [issue, ...prev]);
            setShowForm(false);
            selectIssue(issue.id);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["open", "Aktiv"],
            ["done", "Abgeschlossen"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              statusFilter === id ? "bg-[#6366f1] text-white" : "border border-[#374151] text-[#9ca3af] hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 w-px self-stretch bg-[#374151]" />
        {(
          [
            ["all", "Alle"],
            ["problem", "Probleme"],
            ["project", "Projekte"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setKindFilter(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              kindFilter === id ? "bg-[#374151] text-white" : "border border-[#374151] text-[#9ca3af] hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <aside className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-sm text-[#6b7280]">
              Keine Einträge in dieser Ansicht.
            </p>
          ) : (
            filtered.map((issue) => {
              const stageName = issue.stages[issue.currentStage] ?? "—";
              const stats = checklistStats(issue.stageChecklists[String(issue.currentStage)]);
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => selectIssue(issue.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedId === issue.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[#1f2937] bg-[#111827] hover:border-indigo-500/30",
                  )}
                >
                  <KindBadge kind={issue.kind} />
                  <p className="mt-1 font-medium text-white">{issue.title}</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {issue.status === "done" ? "Abgeschlossen" : stageName}
                    {stats.total > 0 ? ` · ${stats.done}/${stats.total} Tasks` : ""}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        <div>
          {selected ? (
            <IssueDetailPanel
              issue={selected}
              onUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              onCompleted={(id) => {
                setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, status: "done" as const } : i)));
                setStatusFilter("done");
              }}
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#374151] bg-[#111827]/40 p-8 text-center text-sm text-[#6b7280]">
              Links einen Eintrag wählen oder neu anlegen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
