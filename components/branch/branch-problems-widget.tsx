"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { defaultStagesFor, type BranchIssue } from "@/lib/branch/problems";

function StageTracker({ stages, currentStage }: { stages: string[]; currentStage: number }) {
  return (
    <div className="mt-3 flex items-center overflow-x-auto pb-1">
      {stages.map((stage, i) => {
        const done = i < currentStage;
        const active = i === currentStage;
        return (
          <div key={`${stage}-${i}`} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
                  done && "border-indigo-500 bg-indigo-500 text-white",
                  active && "border-amber-400 text-amber-300",
                  !done && !active && "border-[#374151] text-[#6b7280]",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "max-w-[72px] text-center text-[10px] leading-tight",
                  active ? "font-medium text-amber-300" : done ? "text-indigo-300/80" : "text-[#6b7280]",
                )}
              >
                {stage}
              </span>
            </div>
            {i < stages.length - 1 ? (
              <div className={cn("mx-1 h-0.5 min-w-[12px] flex-1", done ? "bg-indigo-500" : "bg-[#374151]")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StageNotesEditor({
  issue,
  onSaved,
}: {
  issue: BranchIssue;
  onSaved: (issue: BranchIssue) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>(issue.stageNotes);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const saveNote = useCallback(
    async (index: number, text: string) => {
      const trimmed = text.trim();
      const prev = issue.stageNotes[String(index)] ?? "";
      if (trimmed === prev) return;

      setSavingIndex(index);
      try {
        const next = { ...issue.stageNotes, ...draft, [String(index)]: trimmed };
        if (!trimmed) delete next[String(index)];

        const res = await fetch(`/api/branch/problems/${issue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stageNotes: next }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
        setDraft(parseStageNotes(data.issue.stageNotes));
        onSaved(data.issue);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      } finally {
        setSavingIndex(null);
      }
    },
    [draft, issue.id, issue.stageNotes, onSaved, toast],
  );

  return (
    <div className="mt-3 space-y-2 border-t border-[#1f2937] pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">Notizen pro Schritt</p>
      {issue.stages.map((stage, i) => (
        <label key={`note-${issue.id}-${i}`} className="block">
          <span className="text-[10px] text-[#9ca3af]">
            {i + 1}. {stage}
            {i === issue.currentStage ? " · aktuell" : ""}
          </span>
          <textarea
            value={draft[String(i)] ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, [String(i)]: e.target.value }))}
            onBlur={(e) => void saveNote(i, e.target.value)}
            rows={2}
            placeholder="Notiz für diesen Schritt…"
            className="mt-1 w-full resize-none rounded-lg border border-[#1f2937] bg-[#111827] px-2.5 py-1.5 text-xs text-[#e5e7eb] placeholder:text-[#6b7280] focus:border-indigo-500/50 focus:outline-none"
          />
          {savingIndex === i ? <span className="text-[10px] text-[#6b7280]">Speichern…</span> : null}
        </label>
      ))}
    </div>
  );
}

function parseStageNotes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const text = String(v ?? "").trim();
    if (text) out[k] = text;
  }
  return out;
}

function statusLine(issue: BranchIssue): string {
  const stage = issue.stages[issue.currentStage] ?? "";
  const stageNote = issue.stageNotes[String(issue.currentStage)];
  const parts: string[] = [];
  if (issue.costEstimate) parts.push(`${stage}: €${issue.costEstimate.toLocaleString("de-DE")}`);
  else if (stage) parts.push(stage);
  if (stageNote) parts.push(stageNote);
  else if (issue.notes) parts.push(issue.notes);
  return parts.join(" · ") || "—";
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
      if (!res.ok) throw new Error(data.error ?? "Could not create entry");
      onCreated(data.issue);
      setTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-3">
      <div className="flex gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "problem" | "project")}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-2 py-1.5 text-sm text-[#e5e7eb]"
        >
          <option value="problem">Problem</option>
          <option value="project">Project</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel…"
          className="flex-1 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-1.5 text-sm text-[#e5e7eb] placeholder:text-[#6b7280]"
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-[#9ca3af] hover:text-white">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !title.trim()}
          className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f46e5] disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Hinzufügen"}
        </button>
      </div>
    </div>
  );
}

export function BranchProblemsWidget({ initialIssues }: { initialIssues: BranchIssue[] }) {
  const { toast } = useToast();
  const [issues, setIssues] = useState(initialIssues.filter((i) => i.status === "open"));
  const [showForm, setShowForm] = useState(false);

  async function advance(issue: BranchIssue) {
    const nextStage = Math.min(issue.currentStage + 1, issue.stages.length - 1);
    const willComplete = issue.currentStage + 1 >= issue.stages.length;
    try {
      const res = await fetch(`/api/branch/problems/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: nextStage, status: willComplete ? "done" : "open" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update");
      if (willComplete) {
        setIssues((prev) => prev.filter((i) => i.id !== issue.id));
        toast.success(`${issue.title} abgeschlossen`);
      } else {
        setIssues((prev) => prev.map((i) => (i.id === issue.id ? data.issue : i)));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#f9fafb]">Problems & projects</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">Status live — Notizen pro Schritt möglich.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-[#1f2937] px-2.5 py-1.5 text-xs font-medium text-[#9ca3af] hover:border-indigo-500/40 hover:text-white"
        >
          <Plus className="size-3.5" aria-hidden /> Add
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {showForm ? (
          <NewIssueForm
            onCreated={(i) => {
              setIssues((prev) => [i, ...prev]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : null}

        {issues.length === 0 && !showForm ? (
          <p className="text-sm text-[#6b7280]">No open problems or projects. Nice and quiet.</p>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    issue.kind === "problem" ? "bg-red-500/15 text-red-300" : "bg-indigo-500/15 text-indigo-300",
                  )}
                >
                  {issue.kind === "problem" ? "Problem" : "Project"}
                </span>
              </div>
              <h3 className="mt-1.5 font-medium text-[#f9fafb]">{issue.title}</h3>
              <StageTracker stages={issue.stages} currentStage={issue.currentStage} />
              <StageNotesEditor
                issue={issue}
                onSaved={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 text-xs text-[#9ca3af]">{statusLine(issue)}</p>
                <button
                  type="button"
                  onClick={() => advance(issue)}
                  className="shrink-0 rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f46e5]"
                >
                  {issue.currentStage + 1 >= issue.stages.length ? "Abschließen" : "Nächster Schritt →"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
