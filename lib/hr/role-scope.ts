import type { AppRole } from "@/types/user";

export const GM_TEMPLATE_TYPES = ["daily", "weekly", "surprise"] as const;
export const HR_TEMPLATE_TYPES = ["hr"] as const;

export function isGmRole(role: AppRole): boolean {
  return role === "general_manager";
}

export function isHrRole(role: AppRole): boolean {
  return role === "hr";
}

export function canAccessHrData(role: AppRole): boolean {
  return role === "hr" || role === "super_admin";
}

export function canAccessGmData(role: AppRole): boolean {
  return role === "general_manager" || role === "super_admin";
}

export function templateTypesForRole(role: AppRole): string[] | null {
  if (role === "general_manager") return [...GM_TEMPLATE_TYPES];
  if (role === "hr") return [...HR_TEMPLATE_TYPES];
  return null;
}

export function requesterRolesForViewer(role: AppRole): AppRole[] | null {
  if (role === "general_manager") return ["general_manager"];
  if (role === "hr") return ["hr"];
  return null;
}
