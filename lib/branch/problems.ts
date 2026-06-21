import type { Database } from "@/lib/database.types";
import { parseStageChecklists, type StageChecklists } from "@/lib/branch/issue-stage-data";
import {
  parseActivities,
  parseCollaborators,
  parsePriority,
  parseStageDueDates,
  parseWorkflowStatus,
  type IssueActivity,
  type IssueCollaborator,
  type IssuePriority,
  type IssueWorkflowStatus,
} from "@/lib/branch/issue-types";
import { normalizeLifecyclePatch, isIssueClosed } from "@/lib/branch/issue-lifecycle";
import {
  assertIssuePatchAllowed,
  enrichIssuePermissions,
  patchTouchesTasks,
} from "@/lib/branch/issue-permissions";
import { createServiceRoleClient } from "@/lib/supabase";

type IssueUpdate = Database["public"]["Tables"]["branch_issues"]["Update"];

export type BranchIssue = {
  id: string;
  ownerBranchId: string;
  ownerBranchName: string;
  ownerUserId: string | null;
  ownerUserName: string;
  isOwner: boolean;
  canManage: boolean;
  canEditTasks: boolean;
  canMutateTaskList: boolean;
  isCollaborator: boolean;
  sharedWithMe: boolean;
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
  collaborators: IssueCollaborator[];
  createdAt: string;
  updatedAt: string;
};

export type CampchefOption = {
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  email: string | null;
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

type IssueRow = {
  id: string;
  branch_id: string;
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
  collaborators?: unknown;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  branches?: { name: string } | { name: string }[] | null;
  owner?: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
};

function branchNameFromRow(row: IssueRow): string {
  const b = row.branches;
  if (!b) return "Filiale";
  if (Array.isArray(b)) return b[0]?.name ?? "Filiale";
  return b.name ?? "Filiale";
}

function ownerNameFromRow(row: IssueRow): string {
  const u = row.owner;
  if (!u) return "Campchef";
  const user = Array.isArray(u) ? u[0] : u;
  return user?.full_name?.trim() || user?.email?.trim() || "Campchef";
}

function mapRow(row: IssueRow, viewer: { branchId: string; userId: string }): BranchIssue {
  const legacyDone = row.status === "done";
  const ownerBranchName = branchNameFromRow(row);
  const ownerUserId = row.created_by ?? null;
  const sharedWithMe = row.branch_id !== viewer.branchId;

  const base = {
    id: row.id,
    ownerBranchId: row.branch_id,
    ownerBranchName,
    ownerUserId,
    ownerUserName: ownerNameFromRow(row),
    sharedWithMe,
    kind: (row.kind === "project" ? "project" : "problem") as "problem" | "project",
    title: row.title,
    stages: Array.isArray(row.stages) ? row.stages.map(String) : [],
    currentStage: row.current_stage,
    status: (legacyDone ? "done" : "open") as "open" | "done",
    workflowStatus: (legacyDone ? "completed" : parseWorkflowStatus(row.workflow_status)) as BranchIssue["workflowStatus"],
    priority: parsePriority(row.priority),
    dueDate: row.due_date ?? null,
    stageDueDates: parseStageDueDates(row.stage_due_dates),
    costEstimate: row.cost_estimate,
    notes: row.notes,
    stageNotes: parseStageNotes(row.stage_notes),
    stageChecklists: parseStageChecklists(row.stage_checklists),
    activities: parseActivities(row.activities),
    collaborators: parseCollaborators(row.collaborators),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  return { ...base, ...enrichIssuePermissions(base, viewer.userId) };
}

const ISSUE_SELECT =
  "id, branch_id, kind, title, stages, current_stage, status, workflow_status, priority, due_date, stage_due_dates, cost_estimate, notes, stage_notes, stage_checklists, activities, collaborators, created_by, created_at, updated_at, branches(name), owner:users!branch_issues_created_by_fkey(full_name, email)";

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

function isCollaborator(issue: BranchIssue, userId: string): boolean {
  return issue.collaborators.some((c) => c.userId === userId);
}

export function canAccessIssue(issue: BranchIssue, branchId: string, userId: string): boolean {
  if (issue.ownerBranchId === branchId) return true;
  return isCollaborator(issue, userId);
}

export async function listAllIssuesForGm(): Promise<BranchIssue[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_issues")
    .select(ISSUE_SELECT)
    .eq("status", "open")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRowForGmViewer(row as IssueRow));
}

export async function getIssueForGm(issueId: string): Promise<BranchIssue | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("branch_issues").select(ISSUE_SELECT).eq("id", issueId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRowForGmViewer(data as IssueRow);
}

/** GM oversight — full visibility, no edit permissions. */
function mapRowForGmViewer(row: IssueRow): BranchIssue {
  const issue = mapRow(row, { branchId: row.branch_id, userId: "" });
  return {
    ...issue,
    isOwner: false,
    canManage: false,
    canEditTasks: false,
    canMutateTaskList: false,
    isCollaborator: false,
    sharedWithMe: false,
  };
}

export async function getIssueAccessible(
  issueId: string,
  viewer: { branchId: string; userId: string },
): Promise<BranchIssue | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("branch_issues").select(ISSUE_SELECT).eq("id", issueId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const issue = mapRow(data as IssueRow, viewer);
  return canAccessIssue(issue, viewer.branchId, viewer.userId) ? issue : null;
}

export async function getIssue(branchId: string, id: string): Promise<BranchIssue | null> {
  return getIssueAccessible(id, { branchId, userId: "" });
}

function issueHasCollaborator(raw: unknown, userId: string): boolean {
  return parseCollaborators(raw).some((c) => c.userId === userId);
}

export async function listIssuesForUser(branchId: string, userId: string): Promise<BranchIssue[]> {
  const supabase = createServiceRoleClient();
  const viewer = { branchId, userId };

  const { data: ownRows, error: ownErr } = await supabase
    .from("branch_issues")
    .select(ISSUE_SELECT)
    .eq("branch_id", branchId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });
  if (ownErr) throw new Error(ownErr.message);

  const { data: sharedRows, error: sharedErr } = await supabase
    .from("branch_issues")
    .select(ISSUE_SELECT)
    .neq("branch_id", branchId)
    .eq("status", "open")
    .order("updated_at", { ascending: false });
  if (sharedErr) throw new Error(sharedErr.message);

  const own = (ownRows ?? []).map((row) => mapRow(row as IssueRow, viewer));
  const shared = (sharedRows ?? [])
    .filter((row) => issueHasCollaborator((row as IssueRow).collaborators, userId))
    .map((row) => mapRow(row as IssueRow, viewer));

  return [...own, ...shared];
}

export async function listIssues(branchId: string): Promise<BranchIssue[]> {
  return listIssuesForUser(branchId, "");
}

export async function listCampchefs(excludeBranchId: string): Promise<CampchefOption[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email, branch_id, branches(name)")
    .eq("role", "branch_manager")
    .eq("is_active", true)
    .neq("branch_id", excludeBranchId)
    .order("full_name");

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => row.branch_id)
    .map((row) => {
      const branch = row.branches as { name: string } | { name: string }[] | null;
      const branchName = Array.isArray(branch) ? branch[0]?.name : branch?.name;
      return {
        userId: row.id,
        userName: row.full_name?.trim() || row.email || "Campchef",
        branchId: row.branch_id as string,
        branchName: branchName ?? "Filiale",
        email: row.email ?? null,
      };
    });
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
      collaborators: [],
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
  return mapRow(data as IssueRow, { branchId, userId });
}

export async function updateIssue(
  id: string,
  ownerBranchId: string,
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
    collaborators?: IssueCollaborator[];
    activityAction?: string;
    activityDetail?: string;
  },
  existing?: BranchIssue,
  viewer?: { branchId: string; userId: string },
): Promise<BranchIssue> {
  const supabase = createServiceRoleClient();
  const update: IssueUpdate = { updated_at: new Date().toISOString() };

  const lifecycle = normalizeLifecyclePatch(
    { status: patch.status, workflowStatus: patch.workflowStatus },
    existing ? { status: existing.status, workflowStatus: existing.workflowStatus } : undefined,
  );
  const mergedPatch = { ...patch, ...lifecycle };

  if (mergedPatch.title !== undefined) update.title = mergedPatch.title.trim();
  if (mergedPatch.stages !== undefined) update.stages = mergedPatch.stages;
  if (mergedPatch.currentStage !== undefined) update.current_stage = mergedPatch.currentStage;
  if (mergedPatch.status !== undefined) update.status = mergedPatch.status;
  if (mergedPatch.workflowStatus !== undefined) update.workflow_status = mergedPatch.workflowStatus;
  if (mergedPatch.priority !== undefined) update.priority = mergedPatch.priority;
  if (mergedPatch.dueDate !== undefined) update.due_date = mergedPatch.dueDate;
  if (mergedPatch.stageDueDates !== undefined) update.stage_due_dates = mergedPatch.stageDueDates;
  if (mergedPatch.notes !== undefined) update.notes = mergedPatch.notes;
  if (mergedPatch.costEstimate !== undefined) update.cost_estimate = mergedPatch.costEstimate;
  if (mergedPatch.stageNotes !== undefined) update.stage_notes = mergedPatch.stageNotes;
  if (mergedPatch.stageChecklists !== undefined) update.stage_checklists = mergedPatch.stageChecklists;
  if (mergedPatch.collaborators !== undefined) update.collaborators = mergedPatch.collaborators;

  if (mergedPatch.activityAction) {
    const base = existing?.activities ?? [];
    update.activities = appendActivity(base, mergedPatch.activityAction, mergedPatch.activityDetail);
  }

  const { data, error } = await supabase
    .from("branch_issues")
    .update(update)
    .eq("id", id)
    .eq("branch_id", ownerBranchId)
    .select(ISSUE_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not update issue");
  return mapRow(data as IssueRow, viewer ?? { branchId: ownerBranchId, userId: "" });
}

export async function updateIssueAccessible(
  issueId: string,
  viewer: { branchId: string; userId: string },
  patch: Parameters<typeof updateIssue>[2],
): Promise<BranchIssue> {
  const existing = await getIssueAccessible(issueId, viewer);
  if (!existing) throw new Error("Issue not found");

  assertIssuePatchAllowed(existing, viewer.userId, patch);

  if (isIssueClosed(existing.status, existing.workflowStatus) && patchTouchesTasks(patch)) {
    throw new Error("Abgeschlossene Einträge können nicht bearbeitet werden — zuerst wieder öffnen");
  }

  await updateIssue(issueId, existing.ownerBranchId, patch, existing, viewer);
  const refreshed = await getIssueAccessible(issueId, viewer);
  if (!refreshed) throw new Error("Issue not found");
  return refreshed;
}
