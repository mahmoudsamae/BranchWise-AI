"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tab = "overview" | "bewertungen";

type Props = {
  overview: ReactNode;
  bewertungen: ReactNode;
};

export function BranchDetailTabs({ overview, bewertungen }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[#1f2937] pb-1">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={cn(
            "rounded-t-lg px-4 py-2 text-sm font-medium transition",
            tab === "overview" ? "bg-[#111827] text-white" : "text-[#9ca3af] hover:text-white",
          )}
        >
          Übersicht
        </button>
        <button
          type="button"
          onClick={() => setTab("bewertungen")}
          className={cn(
            "rounded-t-lg px-4 py-2 text-sm font-medium transition",
            tab === "bewertungen" ? "bg-[#111827] text-white" : "text-[#9ca3af] hover:text-white",
          )}
        >
          Bewertungen
        </button>
      </div>

      {tab === "overview" ? overview : bewertungen}
    </div>
  );
}
