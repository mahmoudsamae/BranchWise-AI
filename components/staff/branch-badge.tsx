import { cn } from "@/lib/cn";
import { branchDisplay } from "@/lib/staff/branch-abbrev";

export function BranchBadge({
  branchName,
  code,
  letter,
  className,
  variant = "inline",
}: {
  branchName: string;
  code?: string;
  letter?: string;
  className?: string;
  variant?: "inline" | "stacked";
}) {
  const info = branchDisplay(branchName);
  const displayLetter = letter ?? info.letter;
  const displayCode = code ?? info.code;
  const palette = info.palette;
  const stacked = variant === "stacked";

  return (
    <span
      title={branchName}
      className={cn(
        "inline-flex items-center",
        stacked ? "flex-col gap-0.5" : "gap-1.5",
        className,
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border font-bold shadow-sm",
          stacked ? "size-9 text-base" : "size-8 text-sm",
          palette.bg,
          palette.border,
          palette.text,
        )}
        aria-hidden
      >
        {displayLetter}
      </span>
      <span
        className={cn(
          "font-semibold uppercase tracking-widest text-[#9ca3af]",
          stacked ? "text-[9px] leading-none" : "hidden min-w-[2rem] text-[10px] sm:inline",
        )}
      >
        {displayCode}
      </span>
    </span>
  );
}
