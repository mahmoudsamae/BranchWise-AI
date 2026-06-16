import type { AppRole } from "@/types/user";

export const DEMO_BRANCH_IDS = {
  regensburg: "00000000-0000-4000-8000-000000000010",
  bodensee: "00000000-0000-4000-8000-000000000011",
  chiemsee: "00000000-0000-4000-8000-000000000012",
  schwarzwald: "00000000-0000-4000-8000-000000000013",
} as const;

export const DEMO_REPORT_ID = "00000000-0000-4000-8000-000000000020";

const DEMO_USERS: Record<
  AppRole,
  { id: string; email: string; full_name: string; branch_id: string | null; branch_name?: string }
> = {
  general_manager: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "demo.manager@branchwise.demo",
    full_name: "Demo General Manager",
    branch_id: null,
  },
  hr: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "demo.hr@branchwise.demo",
    full_name: "Demo HR Lead",
    branch_id: null,
  },
  branch_manager: {
    id: "00000000-0000-4000-8000-000000000003",
    email: "demo.branch@branchwise.demo",
    full_name: "Demo Branch Manager",
    branch_id: DEMO_BRANCH_IDS.regensburg,
    branch_name: "AZUR Camping Regensburg",
  },
  super_admin: {
    id: "00000000-0000-4000-8000-000000000004",
    email: "demo.admin@branchwise.demo",
    full_name: "Demo Super Admin",
    branch_id: null,
  },
};

export function demoUserForRole(role: AppRole) {
  const u = DEMO_USERS[role];
  return {
    id: u.id,
    email: u.email,
    role,
    branch_id: u.branch_id,
    demo: true as const,
  };
}

export function demoProfileForRole(role: AppRole) {
  const u = DEMO_USERS[role];
  return {
    displayName: u.full_name,
    email: u.email,
    branchName: u.branch_name ?? null,
  };
}

export type DemoRoleCard = {
  role: AppRole;
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  home: string;
};

export const DEMO_ROLE_CARDS: DemoRoleCard[] = [
  {
    role: "general_manager",
    title: "General Manager",
    subtitle: "Operations & KPIs",
    description: "Überblick über alle Standorte, Health Scores, offene Reports und Analytics.",
    highlights: ["Operations Dashboard", "Branch Health", "Analytics & KI-Chat", "Exports"],
    home: "/dashboard",
  },
  {
    role: "hr",
    title: "HR",
    subtitle: "Personal & Compliance",
    description: "HR-Reports, Überstunden-Alerts, Personalregister und Onboarding.",
    highlights: ["HR Dashboard", "Staff Registry", "Onboarding", "HR Analytics"],
    home: "/hr",
  },
  {
    role: "branch_manager",
    title: "Branch Manager",
    subtitle: "Standort-Reporting",
    description: "Tägliche und wöchentliche Reports, Google-Bewertungen und Team-Kommunikation.",
    highlights: ["Branch Dashboard", "Report einreichen", "Google Reviews", "Staff"],
    home: "/branch",
  },
  {
    role: "super_admin",
    title: "Super Admin",
    subtitle: "Workspace Setup",
    description: "Benutzer, Filialen und Integrationen verwalten.",
    highlights: ["User Management", "Branches", "Integrations", "Create Accounts"],
    home: "/super-admin",
  },
];
