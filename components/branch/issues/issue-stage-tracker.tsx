"use client";

import { cn } from "@/lib/cn";

export function IssueStageTracker({
  stages,
  currentStage,
  selectedStage,
  onSelectStage,
  compact = false,
}: {
  stages: string[];
  currentStage: number;
  selectedStage?: number;
  onSelectStage?: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center overflow-x-auto pb-1", compact ? "mt-2" : "mt-3")}>
      {stages.map((stage, i) => {
        const done = i < currentStage;
        const active = i === currentStage;
        const selected = selectedStage === i;
        const clickable = Boolean(onSelectStage);

        return (
          <div key={`${stage}-${i}`} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelectStage?.(i)}
              className={cn(
                "flex flex-col items-center gap-1",
                clickable && "cursor-pointer rounded-lg px-1 py-0.5 transition hover:bg-white/5",
                selected && "ring-1 ring-[#6366f1]/50 rounded-lg",
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border-2 font-semibold",
                  compact ? "size-5 text-[9px]" : "size-6 text-[10px]",
                  done && "border-indigo-500 bg-indigo-500 text-white",
                  active && !done && "border-amber-400 text-amber-300",
                  !done && !active && "border-[#374151] text-[#6b7280]",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "max-w-[72px] text-center leading-tight",
                  compact ? "text-[9px]" : "text-[10px]",
                  active ? "font-medium text-amber-300" : done ? "text-indigo-300/80" : "text-[#6b7280]",
                )}
              >
                {stage}
              </span>
            </button>
            {i < stages.length - 1 ? (
              <div className={cn("mx-1 h-0.5 min-w-[12px] flex-1", done ? "bg-indigo-500" : "bg-[#374151]")} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
