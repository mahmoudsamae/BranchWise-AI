"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

import { Button } from "./Button";

export type ModalProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  className?: string;
  closeOnOverlayClick?: boolean;
};

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  className,
  closeOnOverlayClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition"
        aria-label="Close dialog"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        className={cn(
          "relative z-[101] flex max-h-[90vh] w-full max-w-lg scale-100 flex-col rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl transition",
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <Button type="button" variant="ghost" size="sm" className="px-2" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-200">{children}</div>
        {footer ? <div className="shrink-0 border-t border-gray-800 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
