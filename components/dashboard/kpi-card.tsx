import { cn } from "@/lib/cn";

const tones = {
  blue: "border-blue-500/30 bg-blue-500/10",
  red: "border-red-500/30 bg-red-500/10",
  orange: "border-orange-500/30 bg-orange-500/10",
  green: "border-emerald-500/30 bg-emerald-500/10",
  purple: "border-[#6366f1]/40 bg-[#6366f1]/10",
  neutral: "border-[#1f2937] bg-[#111827]",
} as const;

export function KpiCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string | number;
  tone?: keyof typeof tones;
  sub?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4", tones[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6b7280]">{sub}</p> : null}
    </div>
  );
}
