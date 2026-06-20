import type { Database } from "@/lib/database.types";
import { parseStageChecklists, type StageChecklists } from "@/lib/branch/issue-stage-data";
import {
  parseActivities,
  parsePriority,
  parseStageDueDates,
  parseWorkflowStatus,
  type IssueActivity,
  type IssuePriority,
  type IssueWorkflowStatus,
} from "@/lib/branch/issue-types";
import { createServiceRoleClient } from "@/lib/supabase";

type IssueUpdate = Database["public"]["Tables"]["branch_issues"]["Update"];

export type BranchIssue = {
  id: string;
  kind: "problem" | "project";
  title: string;
  stages: string[];
  currentStage: number;
  status: "open" | "done";
  workflowStatus: IssueWorkflowStatus;
  priority: IssuePriority;
  dueDate: string | null;
  stageDueDates: Record<string, string>;
  costEstimate: number | null;
  notes: string | null;
  stageNotes: Record<string, string>;
  stageChecklists: StageChecklists;
  activities: IssueActivity[];
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PROBLEM_STAGES = ["Gemeldet", "Telefonat", "Anfrage", "Kalkulation", "Entscheidung", "Behoben"];
const DEFAULT_PROJECT_STAGES = ["Konzept", "Setup", "Test", "Schulung", "Live"];

export function defaultStagesFor(kind: "problem" | "project"): string[] {
  return kind === "problem" ? DEFAULT_PROBLEM_STAGES : DEFAULT_PROJECT_STAGES;
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

function mapRow(row: {
  id: string;
  kind: string;
  title: string;
  stages: unknown;
  current_stage: number;
  status: string;
  workflow_status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  stage_due_dates?: unknown;
  cost_estimate: number | null;
  notes: string | null;
  stage_notes?: unknown;
  stage_checklists?: unknown;
  activities?: unknown;
  created_at: string;
  updated_at: string;
}): BranchIssue {
  const legacyDone = row.status === "done";
  return {
    id: row.id,
    kind: row.kind === "project" ? "project" : "problem",
    title: row.title,
    stages: Array.isArray(row.stages) ? row.stages.map(String) : [],
    currentStage: row.current_stage,
    status: legacyDone ? "done" : "open",
    workflowStatus: legacyDone ? "completed" : parseWorkflowStatus(row.workflow_status),
    priority: parsePriority(row.priority),
    dueDate: row.due_date ?? null,
    stageDueDates: parseStageDueDates(row.stage_due_dates),
    costEstimate: row.cost_estimate,
    notes: row.notes,
    stageNotes: parseStageNotes(row.stage_notes),
    stageChecklists: parseStageChecklists(row.stage_checklists),
    activities: parseActivities(row.activities),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ISSUE_SELECT =
  "id, kind, title, stages, current_stage, status, workflow_status, priority, due_date, stage_due_dates, cost_estimate, notes, stage_notes, stage_checklists, activities, created_at, updated_at";

export function appendActivity(existing: IssueActivity[], action: string, detail?: string): IssueActivity[] {
  return [
    {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      action,
      detail,
    },
    ...existing,
  ].slice(0, 50);
}

export async function getIssue(branchId: string, id: string): Promise<BranchIssue | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_issues")
    .select(ISSUE_SELECT)
    .eq("branch_id", branchId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

export async function listIssues(branchId: string): Promise<BranchIssue[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_issues")
    .select(ISSUE_SELECT)
    .eq("branch_id", branchId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createIssue(
  branchId: string,
  userId: string,
  input: {
    kind: "problem" | "project";
    title: string;
    stages?: string[];
    stageChecklists?: StageChecklists;
    costEstimate?: number | null;
    notes?: string | null;
    priority?: IssuePriority;
    dueDate?: string | null;
    workflowStatus?: IssueWorkflowStatus;
  },
): Promise<BranchIssue> {
  const supabase = createServiceRoleClient();
  const stages = input.stages && input.stages.length > 0 ? input.stages : defaultStagesFor(input.kind);
  const workflowStatus = input.workflowStatus ?? (input.kind === "project" ? "planning" : "in_progress");

  const { data, error } = await supabase
    .from("branch_issues")
    .insert({
      branch_id: branchId,
      kind: input.kind,
      title: input.title,
      stages,
      stage_checklists: input.stageChecklists ?? {},
      cost_estimate: input.costEstimate ?? null,
      notes: input.notes ?? null,
      priority: input.priority ?? "medium",
      due_date: input.dueDate ?? null,
      workflow_status: workflowStatus,
      activities: appendActivity([], "Erstellt", input.title),
      created_by: userId,
    })
    .select(ISSUE_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create issue");
  return mapRow(data);
}

export async function updateIssue(
  id: string,
  branchId: string,
  patch: {
    title?: string;
    stages?: string[];
    currentStage?: number;
    status?: "open" | "done";
    workflowStatus?: IssueWorkflowStatus;
    priority?: IssuePriority;
    dueDate?: string | null;
    stageDueDates?: Record<string, string>;
    notes?: string | null;
    costEstimate?: number | null;
    stageNotes?: Record<string, string>;
    stageChecklists?: StageChecklists;
    activityAction?: string;
    activityDetail?: string;
  },
  existing?: BranchIssue,
): Promise<BranchIssue> {
  const supabase = createServiceRoleClient();
  const update: IssueUpdate = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.stages !== undefined) update.stages = patch.stages;
  if (patch.currentStage !== undefined) update.current_stage = patch.currentStage;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.workflowStatus !== undefined) update.workflow_status = patch.workflowStatus;
  if (patch.priority !== undefined) update.priority = patch.priority;
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.stageDueDates !== undefined) update.stage_due_dates = patch.stageDueDates;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.costEstimate !== undefined) update.cost_estimate = patch.costEstimate;
  if (patch.stageNotes !== undefined) update.stage_notes = patch.stageNotes;
  if (patch.stageChecklists !== undefined) update.stage_checklists = patch.stageChecklists;

  if (patch.status === "done") update.workflow_status = "completed";
  if (patch.activityAction) {
    const base = existing?.activities ?? [];
    update.activities = appendActivity(base, patch.activityAction, patch.activityDetail);
  }

  const { data, error } = await supabase
    .from("branch_issues")
    .update(update)
    .eq("id", id)
    .eq("branch_id", branchId)
    .select(ISSUE_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not update issue");
  return mapRow(data);
}
