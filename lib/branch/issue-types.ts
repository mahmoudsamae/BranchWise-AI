export type OwnerFunction =
  | "rezeption"
  | "sanitaer"
  | "gruenpflege"
  | "technik"
  | "betrieb"
  | "gastro"
  | "gm_hq"
  | "hr"
  | "filiale";

export const OWNER_FUNCTION_LABELS: Record<OwnerFunction, string> = {
  rezeption: "Rezeption",
  sanitaer: "Sanitär",
  gruenpflege: "Grünanlage",
  technik: "Technik",
  betrieb: "Betrieb",
  gastro: "Küche / Gastro",
  gm_hq: "GM / HQ",
  hr: "HR",
  filiale: "Filiale (allg.)",
};

export const OWNER_FUNCTION_ORDER: OwnerFunction[] = [
  "rezeption",
  "sanitaer",
  "gruenpflege",
  "technik",
  "betrieb",
  "gastro",
  "gm_hq",
  "hr",
  "filiale",
];

export function parseOwnerFunction(raw: unknown): OwnerFunction {
  const v = String(raw ?? "").toLowerCase();
  if (v === "rezeption" || v === "reception" || v === "empfang") return "rezeption";
  if (v === "sanitaer" || v === "sanitär" || v === "sanitary") return "sanitaer";
  if (v === "gruenpflege" || v === "gruen" || v === "grün" || v === "grounds" || v === "pflege") {
    return "gruenpflege";
  }
  if (v === "technik" || v === "engineering") return "technik";
  if (v === "betrieb" || v === "ops") return "betrieb";
  if (v === "gastro" || v === "kueche" || v === "küche" || v === "fruhstuck" || v === "kitchen") {
    return "gastro";
  }
  if (v === "gm_hq" || v === "gm" || v === "hq" || v === "produkt" || v === "product" || v === "design" || v === "qa") {
    return "gm_hq";
  }
  if (v === "hr") return "hr";
  if (v === "filiale" || v === "branch") return "filiale";
  return "filiale";
}

export type IssueWorkflowStatus = "planning" | "in_progress" | "blocked" | "completed";
export type IssuePriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in_progress" | "review" | "completed";

export const WORKFLOW_LABELS: Record<IssueWorkflowStatus, string> = {
  planning: "Planung",
  in_progress: "In Arbeit",
  blocked: "Blockiert",
  completed: "Abgeschlossen",
};

export const PRIORITY_LABELS: Record<IssuePriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Arbeit",
  review: "Review",
  completed: "Erledigt",
};

export const TASK_COLUMNS: TaskStatus[] = ["todo", "in_progress", "review", "completed"];

export function parseWorkflowStatus(raw: unknown): IssueWorkflowStatus {
  if (raw === "planning" || raw === "in_progress" || raw === "blocked" || raw === "completed") return raw;
  return "in_progress";
}

export function parsePriority(raw: unknown): IssuePriority {
  if (raw === "low" || raw === "medium" || raw === "high" || raw === "critical") return raw;
  return "medium";
}

export function parseTaskStatus(raw: unknown, done?: boolean): TaskStatus {
  if (done) return "completed";
  if (raw === "todo" || raw === "in_progress" || raw === "review" || raw === "completed") return raw;
  return "todo";
}

export type IssueCollaborator = {
  id: string;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  invitedAt: string;
};

export function parseCollaborators(raw: unknown): IssueCollaborator[] {
  if (!Array.isArray(raw)) return [];
  const out: IssueCollaborator[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const userId = String(r.userId ?? "").trim();
    if (!userId) continue;
    out.push({
      id: String(r.id ?? userId),
      userId,
      userName: String(r.userName ?? "Campchef").trim(),
      branchId: String(r.branchId ?? "").trim(),
      branchName: String(r.branchName ?? "Filiale").trim(),
      invitedAt: String(r.invitedAt ?? new Date().toISOString()),
    });
  }
  return out;
}

export type IssueActivity = {
  id: string;
  at: string;
  action: string;
  detail?: string;
};

export function parseActivities(raw: unknown): IssueActivity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const action = String(r.action ?? "").trim();
      if (!action) return null;
      return {
        id: String(r.id ?? crypto.randomUUID()),
        at: String(r.at ?? new Date().toISOString()),
        action,
        detail: r.detail ? String(r.detail) : undefined,
      };
    })
    .filter(Boolean) as IssueActivity[];
}

export function parseStageDueDates(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const d = String(v ?? "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) out[k] = d;
  }
  return out;
}
