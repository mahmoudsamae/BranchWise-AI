import type { AppRole } from "@/types/user";

import { cn } from "@/lib/cn";

const roleStyles: Record<AppRole, string> = {
  super_admin: "border-purple-500/30 bg-purple-500/20 text-purple-300",
  general_manager: "border-blue-500/30 bg-blue-500/20 text-blue-300",
  hr: "border-amber-500/30 bg-amber-500/20 text-amber-300",
  branch_manager: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300",
};

const variants = {
  purple: "border-indigo-500/30 bg-indigo-500/20 text-indigo-400",
  green: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  red: "bg-red-500/20 text-red-400 border border-red-500/30",
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  gray: "bg-gray-700 text-gray-400 border border-gray-600",
} as const;

export type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | AppRole;
  variant?: keyof typeof variants;
  size?: "sm" | "md";
};

export function Badge({ children, className, tone = "default", variant, size = "md" }: BadgeProps) {
  const roleClass = tone !== "default" ? roleStyles[tone] : variants[variant ?? "gray"];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        roleClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
