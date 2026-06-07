import { cn } from "@/lib/cn";

const colors = {
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  red: "border-red-500/30 bg-red-500/10 text-red-300",
  yellow: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  purple: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
} as const;

export function StatCard({
  title,
  label,
  value,
  suffix,
  trend,
  icon,
  color = "purple",
}: {
  title?: string;
  label?: string;
  value: string | number;
  suffix?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: keyof typeof colors;
}) {
  const trendUp = trend != null && trend >= 0;
  return (
    <div className={cn("rounded-xl border p-4", colors[color])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title ?? label}</p>
        {icon ? <span className="opacity-80">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold text-white">
        {value}
        {suffix ? <span className="ml-1 text-sm font-normal text-gray-400">{suffix}</span> : null}
      </p>
      {trend != null ? (
        <p className={cn("mt-1 text-xs font-medium", trendUp ? "text-emerald-400" : "text-red-400")}>
          {trendUp ? "+" : ""}
          {trend}% vs prior period
        </p>
      ) : null}
    </div>
  );
}
