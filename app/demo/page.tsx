import type { Metadata } from "next";
import Link from "next/link";

import { DemoRolePicker } from "@/components/demo/demo-role-picker";

export const metadata: Metadata = {
  title: "Demo — BranchWise AI",
  description: "Interaktive Demo mit fiktiven Daten für alle Rollen.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white antialiased">
      <header className="sticky top-0 z-50 border-b border-[#1f2937] bg-[#0a0f1e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            BranchWise AI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#9ca3af] transition hover:text-white">
              Anmelden
            </Link>
            <span className="rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-200 ring-1 ring-violet-500/30">
              Live Demo
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 inline-flex rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            Portfolio-Vorschau · Keine echten Daten
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            BranchWise AI <span className="text-indigo-400">live erleben</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#9ca3af]">
            Wähle eine Rolle und erkunde das komplette System — Operations Dashboard, HR, Filial-Reporting und
            Super-Admin — mit fiktiven AZUR Camping Daten.
          </p>
        </div>

        <div className="mt-12">
          <DemoRolePicker />
        </div>

        <p className="mt-10 text-center text-xs text-[#6b7280]">
          Demo-Modus ist schreibgeschützt. Für den produktiven Einsatz bitte{" "}
          <Link href="/login" className="text-indigo-400 hover:underline">
            anmelden
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
