import type { Database } from "@/lib/database.types";
import { createServiceRoleClient } from "@/lib/supabase";

type IssueUpdate = Database["public"]["Tables"]["branch_issues"]["Update"];

export type BranchIssue = {
  id: string;
  kind: "problem" | "project";
  title: string;
  stages: string[];
  currentStage: number;
  status: "open" | "done";
  costEstimate: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PROBLEM_STAGES = ["Gemeldet", "Telefonat", "Anfrage", "Kalkulation", "Entscheidung", "Behoben"];
const DEFAULT_PROJECT_STAGES = ["Konzept", "Setup", "Test", "Schulung", "Live"];

export function defaultStagesFor(kind: "problem" | "project"): string[] {
  return kind === "problem" ? DEFAULT_PROBLEM_STAGES : DEFAULT_PROJECT_STAGES;
}

function mapRow(row: {
  id: string;
  kind: string;
  title: string;
  stages: unknown;
  current_stage: number;
  status: string;
  cost_estimate: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): BranchIssue {
  return {
    id: row.id,
    kind: row.kind === "project" ? "project" : "problem",
    title: row.title,
    stages: Array.isArray(row.stages) ? row.stages.map(String) : [],
    currentStage: row.current_stage,
    status: row.status === "done" ? "done" : "open",
    costEstimate: row.cost_estimate,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listIssues(branchId: string): Promise<BranchIssue[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_issues")
    .select("id, kind, title, stages, current_stage, status, cost_estimate, notes, created_at, updated_at")
    .eq("branch_id", branchId)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createIssue(
  branchId: string,
  userId: string,
  input: { kind: "problem" | "project"; title: string; stages?: string[]; costEstimate?: number | null; notes?: string | null },
): Promise<BranchIssue> {
  const supabase = createServiceRoleClient();
  const stages = input.stages && input.stages.length > 0 ? input.stages : defaultStagesFor(input.kind);

  const { data, error } = await supabase
    .from("branch_issues")
    .insert({
      branch_id: branchId,
      kind: input.kind,
      title: input.title,
      stages,
      cost_estimate: input.costEstimate ?? null,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select("id, kind, title, stages, current_stage, status, cost_estimate, notes, created_at, updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create issue");
  return mapRow(data);
}

export async function updateIssue(
  id: string,
  branchId: string,
  patch: { currentStage?: number; status?: "open" | "done"; notes?: string | null; costEstimate?: number | null },
): Promise<BranchIssue> {
  const supabase = createServiceRoleClient();
  const update: IssueUpdate = { updated_at: new Date().toISOString() };
  if (patch.currentStage !== undefined) update.current_stage = patch.currentStage;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.notes !== undefined) update.notes = patch.notes;
  if (patch.costEstimate !== undefined) update.cost_estimate = patch.costEstimate;

  const { data, error } = await supabase
    .from("branch_issues")
    .update(update)
    .eq("id", id)
    .eq("branch_id", branchId)
    .select("id, kind, title, stages, current_stage, status, cost_estimate, notes, created_at, updated_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not update issue");
  return mapRow(data);
}
