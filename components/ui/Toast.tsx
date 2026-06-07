"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

type ToastContextValue = {
  showToast: (message: string, variant: ToastVariant) => void;
  toast: ToastApi;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const styles: Record<ToastVariant, string> = {
  success: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  error: "border-red-500/40 bg-red-500/15 text-red-100",
  warning: "border-amber-500/40 bg-amber-500/15 text-amber-100",
  info: "border-blue-500/40 bg-blue-500/15 text-blue-100",
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastVariant) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (m) => showToast(m, "success"),
      error: (m) => showToast(m, "error"),
      warning: (m) => showToast(m, "warning"),
      info: (m) => showToast(m, "info"),
    }),
    [showToast],
  );

  const value = useMemo(() => ({ showToast, toast }), [showToast, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-in fade-in slide-in-from-top-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition duration-300",
              styles[t.variant],
            )}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
