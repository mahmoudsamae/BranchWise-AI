import Link from "next/link";
import { Sparkles } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="border-b border-violet-500/30 bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-violet-600/20 px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-violet-100">
          <Sparkles className="size-4 shrink-0 text-violet-300" aria-hidden />
          <span>
            <strong className="text-white">Demo-Modus</strong> — Fiktive AZUR Camping Daten nur zur Vorschau. Keine
            echten Änderungen.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/demo"
            className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20"
          >
            Rolle wechseln
          </Link>
          <Link
            href="/api/auth/logout"
            className="rounded-lg border border-[#374151] bg-[#111827]/80 px-3 py-1.5 text-xs font-semibold text-[#d1d5db] transition hover:border-[#4b5563]"
          >
            Demo beenden
          </Link>
        </div>
      </div>
    </div>
  );
}
