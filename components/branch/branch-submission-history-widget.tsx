"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CollapsibleWidget } from "@/components/branch/collapsible-widget";
import type { SubmissionHistoryPoint, SubmissionHistoryStatus } from "@/lib/branch/submission-history";

const STATUS_COLORS: Record<SubmissionHistoryStatus, string> = {
  submitted: "#34d399",
  overdue: "#f87171",
  pending: "#6b7280",
};

const STATUS_LABELS: Record<SubmissionHistoryStatus, string> = {
  submitted: "Submitted on time",
  overdue: "Overdue",
  pending: "Pending",
};

type ChartRow = SubmissionHistoryPoint & { value: number };

export function BranchSubmissionHistoryWidget({ history }: { history: SubmissionHistoryPoint[] }) {
  const chartData: ChartRow[] = history.map((row) => ({ ...row, value: 1 }));

  return (
    <CollapsibleWidget title="Submission history" description="Your last 8 report periods at a glance.">
      {chartData.length === 0 ? (
        <p className="text-sm text-[#9ca3af]">No report history yet.</p>
      ) : (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 11 }} interval={0} />
              <YAxis hide domain={[0, 1.2]} />
              <Tooltip
                cursor={{ fill: "rgba(99, 102, 241, 0.08)" }}
                contentStyle={{ background: "#0a0f1e", border: "1px solid #1f2937", borderRadius: 8 }}
                formatter={(_, __, item) => {
                  const row = item.payload as ChartRow;
                  return [STATUS_LABELS[row.status], row.week];
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {chartData.map((row, i) => (
                  <Cell key={`${row.week}-${i}`} fill={STATUS_COLORS[row.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </CollapsibleWidget>
  );
}
