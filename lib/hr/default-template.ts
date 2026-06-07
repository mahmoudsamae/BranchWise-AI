import type { TemplateField } from "@/lib/report-builder/template-fields";

export const HR_DEFAULT_TEMPLATE_ID = "00000000-0000-4000-8000-000000000002";

export const HR_FIELD_IDS = {
  staffSummary: "f1",
  totalOvertime: "f2",
  totalAbsences: "f3",
  totalLateArrivals: "f4",
  staffIssues: "f5",
  teamMorale: "f6",
  supportNeeded: "f7",
  notes: "f8",
} as const;

export const HR_DEFAULT_FIELDS: TemplateField[] = [
  {
    id: HR_FIELD_IDS.staffSummary,
    type: "textarea",
    label: "Staff summary this week",
    required: true,
    placeholder: "",
  },
  {
    id: HR_FIELD_IDS.totalOvertime,
    type: "number",
    label: "Total overtime hours (all staff)",
    required: true,
    placeholder: "0",
  },
  {
    id: HR_FIELD_IDS.totalAbsences,
    type: "number",
    label: "Total absences",
    required: false,
    placeholder: "0",
  },
  {
    id: HR_FIELD_IDS.totalLateArrivals,
    type: "number",
    label: "Total late arrivals",
    required: false,
    placeholder: "0",
  },
  {
    id: HR_FIELD_IDS.staffIssues,
    type: "textarea",
    label: "Staff issues or complaints",
    required: false,
    placeholder: "",
  },
  {
    id: HR_FIELD_IDS.teamMorale,
    type: "select",
    label: "Overall team morale",
    required: true,
    placeholder: "",
    options: ["Good", "Neutral", "Poor"],
  },
  {
    id: HR_FIELD_IDS.supportNeeded,
    type: "textarea",
    label: "Support needed from HR/HQ",
    required: false,
    placeholder: "",
  },
  {
    id: HR_FIELD_IDS.notes,
    type: "textarea",
    label: "Additional notes",
    required: false,
    placeholder: "",
  },
];

export const HR_DEFAULT_TEMPLATE = {
  id: HR_DEFAULT_TEMPLATE_ID,
  title: "Weekly Staff Report",
  type: "hr" as const,
  fields: HR_DEFAULT_FIELDS,
};
