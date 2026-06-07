import { cn } from "@/lib/cn";

const variants = {
  default: "border-gray-800 bg-gray-900",
  elevated: "border-gray-700 bg-gray-800",
  highlight: "border-indigo-500/30 bg-indigo-500/5",
} as const;

export type CardProps = {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
};

export function Card({ title, subtitle, actions, variant = "default", className, children }: CardProps) {
  return (
    <section className={cn("rounded-xl border p-6", variants[variant], className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-gray-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
