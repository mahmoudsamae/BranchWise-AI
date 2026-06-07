import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-6 py-12 text-center", className)}>
      {icon ? <div className="mb-4 text-gray-500">{icon}</div> : null}
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-gray-400">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
