import type { AppRole } from "@/types/user";

export type HubChannelRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visible_roles: string[];
  created_at: string;
};

const HUB_ROLES: AppRole[] = ["general_manager", "hr", "branch_manager"];

export function isHubParticipant(role: AppRole): boolean {
  return HUB_ROLES.includes(role);
}

export function canAccessChannel(channel: { visible_roles: string[] }, role: AppRole): boolean {
  if (!isHubParticipant(role)) return false;
  return channel.visible_roles.includes(role);
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "general_manager":
      return "GM";
    case "hr":
      return "HR";
    case "branch_manager":
      return "Branch";
    default:
      return role;
  }
}

export function visibleRolesLabel(roles: string[]): string {
  const labels: string[] = [];
  if (roles.includes("general_manager")) labels.push("General Manager");
  if (roles.includes("hr")) labels.push("HR");
  if (roles.includes("branch_manager")) labels.push("Branch Manager");
  return labels.join(", ") || "—";
}
