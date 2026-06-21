"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

export type ListMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
};

export function IssueListMenu({
  items,
  onClose,
  className,
}: {
  items: ListMenuItem[];
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[220px] overflow-hidden rounded-lg border border-[#2d2f33] bg-[#252628] py-1 shadow-xl",
        className,
      )}
      role="menu"
    >
      {items.map((item) =>
        item.separator ? (
          <div key={item.id} className="my-1 border-t border-[#2d2f33]" />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition",
              item.danger ? "text-red-400 hover:bg-red-500/10" : "text-[#f3f4f6] hover:bg-[#35363a]",
              item.disabled && "cursor-not-allowed opacity-40",
            )}
          >
            {item.icon ? <span className="flex size-4 shrink-0 items-center justify-center text-[#9ca3af]">{item.icon}</span> : null}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
