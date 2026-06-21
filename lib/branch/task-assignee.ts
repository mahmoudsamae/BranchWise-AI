import {
  OWNER_FUNCTION_LABELS,
  OWNER_FUNCTION_ORDER,
  type OwnerFunction,
} from "@/lib/branch/issue-types";

/** Shown near staff assignee pickers — staff have no app login. */
export const STAFF_ASSIGNEE_HINT =
  "Person aus dem Staff-Verzeichnis — ohne App-Login, nur zur Nachverfolgung im Filialbetrieb.";

export const OWNER_FUNCTION_HINT =
  "Verantwortlicher Bereich auf dem Campingplatz (nicht zwingend die zugewiesene Person).";

export function ownerFunctionSelectOptions(): { value: OwnerFunction; label: string }[] {
  return OWNER_FUNCTION_ORDER.map((value) => ({
    value,
    label: OWNER_FUNCTION_LABELS[value],
  }));
}
