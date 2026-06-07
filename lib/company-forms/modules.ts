export const COMPANY_FORM_MODULES = ["document_renewal", "policy", "incident", "shift_handover"] as const;

export type CompanyFormModule = (typeof COMPANY_FORM_MODULES)[number];

export type ModuleConfig = {
  label: string;
  description: string;
  hrPath: string;
  branchPath?: string;
  publicPathPrefix: string;
  supportsInvites: boolean;
  supportsBulkInvites: boolean;
  requiresStaffOnInvite: boolean;
  branchOnly: boolean;
  defaultValidityDays: number;
};

export const MODULE_CONFIG: Record<CompanyFormModule, ModuleConfig> = {
  document_renewal: {
    label: "Document Renewal",
    description: "Request updated documents from employees and track expiry dates.",
    hrPath: "/hr/document-renewal",
    publicPathPrefix: "/forms/document-renewal",
    supportsInvites: true,
    supportsBulkInvites: false,
    requiresStaffOnInvite: true,
    branchOnly: false,
    defaultValidityDays: 365,
  },
  policy: {
    label: "Policies",
    description: "Distribute policies and collect digital acknowledgments.",
    hrPath: "/hr/policies",
    publicPathPrefix: "/forms/policy",
    supportsInvites: true,
    supportsBulkInvites: true,
    requiresStaffOnInvite: true,
    branchOnly: false,
    defaultValidityDays: 0,
  },
  incident: {
    label: "Incidents",
    description: "Branch QR codes for incident and complaint reports.",
    hrPath: "/hr/incidents",
    publicPathPrefix: "/incident",
    supportsInvites: false,
    supportsBulkInvites: false,
    requiresStaffOnInvite: false,
    branchOnly: false,
    defaultValidityDays: 0,
  },
  shift_handover: {
    label: "Shift Handover",
    description: "End-of-shift logs filled in by branch managers.",
    hrPath: "/hr/shift-handover",
    branchPath: "/branch/handover",
    publicPathPrefix: "/forms/shift-handover",
    supportsInvites: false,
    supportsBulkInvites: false,
    requiresStaffOnInvite: false,
    branchOnly: true,
    defaultValidityDays: 0,
  },
};

export function isCompanyFormModule(v: string): v is CompanyFormModule {
  return (COMPANY_FORM_MODULES as readonly string[]).includes(v);
}

export function publicFormPath(module: CompanyFormModule, token: string): string {
  return `${MODULE_CONFIG[module].publicPathPrefix}/${token}`;
}
