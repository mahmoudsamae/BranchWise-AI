"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatWorkDate, isTodayWorkDate, shiftWorkDate, todayWorkDate } from "@/lib/branch-ops/dates";

export function OpsDateNav({
  date,
  onChange,
}: {
  date: string;
  onChange: (date: string) => void;
}) {
  const isToday = isTodayWorkDate(date);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-lg border border-[#1f2937] bg-[#111827]">
        <button
          type="button"
          onClick={() => onChange(shiftWorkDate(date, -1))}
          className="rounded-l-lg p-2 text-[#9ca3af] hover:bg-[#1f2937] hover:text-white"
          aria-label="Previous day"
        >
          <ChevronLeft className="size-4" />
        </button>
        <input
          type="date"
          value={date}
          max={todayWorkDate()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="border-x border-[#1f2937] bg-transparent px-2 py-1.5 text-sm text-white [color-scheme:dark]"
        />
        <button
          type="button"
          onClick={() => onChange(shiftWorkDate(date, 1))}
          disabled={isToday}
          className="rounded-r-lg p-2 text-[#9ca3af] hover:bg-[#1f2937] hover:text-white disabled:opacity-40"
          aria-label="Next day"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {!isToday ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(todayWorkDate())}>
          <Calendar className="size-4" /> Today
        </Button>
      ) : null}
      <span className={`text-xs ${isToday ? "text-[#6366f1]" : "text-amber-400/90"}`}>
        {isToday ? "Today" : "Archive"} · {formatWorkDate(date)}
      </span>
    </div>
  );
}
