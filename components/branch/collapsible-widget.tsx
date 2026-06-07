"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export function CollapsibleWidget({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-[#1f2937] bg-[#111827]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-[#f9fafb]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#9ca3af]">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn("mt-1 size-5 shrink-0 text-[#9ca3af] transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? <div className="border-t border-[#1f2937] px-5 pb-5 pt-4">{children}</div> : null}
    </section>
  );
}
