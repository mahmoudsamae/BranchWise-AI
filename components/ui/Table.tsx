import { cn } from "@/lib/cn";

export { DataTable, type DataTableColumn } from "./DataTable";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-gray-800", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm text-gray-300">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-gray-800 bg-gray-800/50 text-xs font-semibold uppercase tracking-wider text-gray-400">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-800">{children}</tbody>;
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition hover:bg-gray-800/50", className)}>{children}</tr>;
}

export function TableCell({
  children,
  className,
  as: Tag = "td",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "td" | "th";
  colSpan?: number;
}) {
  const Comp = Tag;
  return (
    <Comp
      colSpan={colSpan}
      className={cn("px-4 py-3 align-middle", Tag === "th" ? "font-medium text-gray-400" : "text-gray-300", className)}
    >
      {children}
    </Comp>
  );
}
