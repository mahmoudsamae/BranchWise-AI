import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, className, id, required, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-400">
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </label>
      <div className="relative">
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            "h-10 w-full rounded-lg border bg-gray-800/50 px-3 text-sm text-white outline-none transition placeholder:text-gray-500",
            "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            error ? "border-red-500 ring-1 ring-red-500/20" : "border-gray-700",
            className,
          )}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
});
