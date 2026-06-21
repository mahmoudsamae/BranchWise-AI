export const COMPANY_FORM_MODULES = ["document_renewal", "policy", "incident"] as const;

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
    label: "Dokumentenerneuerung",
    description: "Aktualisierte Dokumente von Mitarbeitenden anfordern und Ablaufdaten verfolgen.",
    hrPath: "/hr/document-renewal",
    publicPathPrefix: "/forms/document-renewal",
    supportsInvites: true,
    supportsBulkInvites: false,
    requiresStaffOnInvite: true,
    branchOnly: false,
    defaultValidityDays: 365,
  },
  policy: {
    label: "Richtlinien",
    description: "Richtlinien verteilen und digitale Bestätigungen sammeln.",
    hrPath: "/hr/policies",
    publicPathPrefix: "/forms/policy",
    supportsInvites: true,
    supportsBulkInvites: true,
    requiresStaffOnInvite: true,
    branchOnly: false,
    defaultValidityDays: 0,
  },
  incident: {
    label: "Vorfälle",
    description: "Filial-QR-Codes für Vorfall- und Beschwerdemeldungen.",
    hrPath: "/hr/incidents",
    publicPathPrefix: "/incident",
    supportsInvites: false,
    supportsBulkInvites: false,
    requiresStaffOnInvite: false,
    branchOnly: false,
    defaultValidityDays: 0,
  },
};

export function isCompanyFormModule(v: string): v is CompanyFormModule {
  return (COMPANY_FORM_MODULES as readonly string[]).includes(v);
}

export function publicFormPath(module: CompanyFormModule, token: string): string {
  return `${MODULE_CONFIG[module].publicPathPrefix}/${token}`;
}
