"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { defaultStagesFor, type BranchIssue } from "@/lib/branch/problems";
import type { IssuePriority } from "@/lib/branch/issue-types";

export function IssuePlanningForm({
  onCreated,
  onCancel,
}: {
  onCreated: (issue: BranchIssue) => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [kind, setKind] = useState<"problem" | "project">("project");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [plannedStages, setPlannedStages] = useState<string[] | null>(null);
  const [plannedChecklists, setPlannedChecklists] = useState<BranchIssue["stageChecklists"] | null>(null);

  async function suggestPlan() {
    const text = (goal || title).trim();
    if (!text) return;
    setPlanning(true);
    try {
      const res = await fetch("/api/branch/problems/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, goal: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Planung fehlgeschlagen");
      setPlannedStages(data.stages ?? defaultStagesFor(kind));
      setPlannedChecklists(data.stageChecklists ?? {});
      setPlanSummary(data.summary ?? null);
      if (!title.trim()) setTitle(text.slice(0, 120));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Planung fehlgeschlagen");
    } finally {
      setPlanning(false);
    }
  }

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/branch/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          stages: plannedStages ?? defaultStagesFor(kind),
          stageChecklists: plannedChecklists ?? {},
          priority,
          dueDate: dueDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erstellen fehlgeschlagen");
      onCreated(data.issue);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erstellen fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-4">
      <p className="text-sm font-medium text-white">Neues Projekt oder Problem</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "problem" | "project");
            setPlannedStages(null);
            setPlannedChecklists(null);
            setPlanSummary(null);
          }}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="problem">Problem</option>
          <option value="project">Projekt</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as IssuePriority)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="low">Priorität: Niedrig</option>
          <option value="medium">Priorität: Mittel</option>
          <option value="high">Priorität: Hoch</option>
          <option value="critical">Priorität: Kritisch</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel…"
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white md:col-span-2"
        />
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Ziel, Idee oder Problem beschreiben (für Struktur-Vorschlag)…"
          rows={3}
          className="resize-none rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white md:col-span-2"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => void suggestPlan()}
          disabled={planning || !(goal.trim() || title.trim())}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
        >
          {planning ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Struktur vorschlagen
        </button>
      </div>
      {planSummary ? (
        <p className="mt-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-100">
          {planSummary}
          {plannedStages ? (
            <span className="mt-1 block text-[#9ca3af]">Phasen: {plannedStages.join(" → ")}</span>
          ) : null}
        </p>
      ) : null}
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
