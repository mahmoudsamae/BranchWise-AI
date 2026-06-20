import { defaultStagesFor } from "@/lib/branch/problems";

import type { StageChecklists } from "./issue-stage-data";

export type IssuePlanSuggestion = {
  stages: string[];
  stageChecklists: StageChecklists;
  summary: string;
};

const PROJECT_TEMPLATES: Record<string, { stages: string[]; tasks: string[][] }> = {
  software: {
    stages: ["Research", "Design", "Backend", "Frontend", "Testing", "Deployment"],
    tasks: [
      ["Anforderungen sammeln", "Wettbewerb analysieren"],
      ["Wireframes", "UI-Konzept"],
      ["Datenbank", "API Endpoints"],
      ["Screens bauen", "Integration"],
      ["QA Testplan", "Bugfixes"],
      ["Release", "Monitoring"],
    ],
  },
  rollout: {
    stages: ["Konzept", "Setup", "Test", "Schulung", "Live"],
    tasks: [
      ["Ziele definieren", "Stakeholder informieren"],
      ["Hardware/Software vorbereiten", "Konfiguration"],
      ["Pilot testen", "Feedback sammeln"],
      ["Team schulen", "Anleitung schreiben"],
      ["Go-Live", "Nachverfolgung"],
    ],
  },
};

function pickTemplate(goal: string, kind: "problem" | "project") {
  const g = goal.toLowerCase();
  if (kind === "project") {
    if (/software|app|saas|web|system|plattform/.test(g)) return PROJECT_TEMPLATES.software;
    return PROJECT_TEMPLATES.rollout;
  }
  return null;
}

export function suggestIssuePlan(kind: "problem" | "project", goal: string): IssuePlanSuggestion {
  const trimmed = goal.trim();
  const template = pickTemplate(trimmed, kind);
  const stages = template?.stages ?? defaultStagesFor(kind);
  const stageChecklists: StageChecklists = {};

  stages.forEach((stage, index) => {
    const preset = template?.tasks[index] ?? [];
    if (preset.length) {
      stageChecklists[String(index)] = preset.map((text) => ({
        id: crypto.randomUUID(),
        text,
        done: false,
        status: "todo" as const,
        priority: "medium" as const,
        dueDate: null,
      }));
    }
  });

  return {
    stages,
    stageChecklists,
    summary:
      kind === "project"
        ? `Vorschlag für „${trimmed}“ mit ${stages.length} Meilensteinen.`
        : `Standard-Workflow für Problem „${trimmed}“.`,
  };
}
