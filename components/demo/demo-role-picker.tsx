"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Loader2, Shield, UserCog, Users } from "lucide-react";

import { DEMO_ROLE_CARDS } from "@/lib/demo/config";
import type { AppRole } from "@/types/user";

const ICONS: Record<AppRole, React.ReactNode> = {
  general_manager: <Building2 className="size-6 text-indigo-300" aria-hidden />,
  hr: <Users className="size-6 text-emerald-300" aria-hidden />,
  branch_manager: <UserCog className="size-6 text-amber-300" aria-hidden />,
  super_admin: <Shield className="size-6 text-violet-300" aria-hidden />,
};

export function DemoRolePicker() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<AppRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo(role: AppRole, redirect: string) {
    setError(null);
    setLoadingRole(role);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error ?? "Demo konnte nicht gestartet werden");
        return;
      }
      router.replace(data.redirect ?? redirect);
      router.refresh();
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen");
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        {DEMO_ROLE_CARDS.map((card) => {
          const busy = loadingRole === card.role;
          return (
            <article
              key={card.role}
              className="group flex flex-col rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-900/20"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl border border-[#1f2937] bg-[#0a0f1e]">
                  {ICONS[card.role]}
                </div>
                <span className="rounded-full border border-[#374151] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                  Demo
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">{card.title}</h2>
              <p className="text-sm font-medium text-indigo-300">{card.subtitle}</p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#9ca3af]">{card.description}</p>
              <ul className="mt-4 space-y-1.5">
                {card.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs text-[#d1d5db]">
                    <span className="size-1.5 rounded-full bg-indigo-400" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={loadingRole !== null}
                onClick={() => void enterDemo(card.role, card.home)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Wird geladen…
                  </>
                ) : (
                  <>
                    Als {card.title} testen
                    <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
