import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BranchWise AI",
  description: "Operational intelligence for distributed teams.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white antialiased">
      <header className="sticky top-0 z-50 border-b border-[#1f2937] bg-[#0a0f1e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            BranchWise AI
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="rounded-lg border border-violet-500/50 bg-violet-600/15 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-600/25"
            >
              Live Demo
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-indigo-500/60 bg-transparent px-4 py-2 text-sm font-semibold text-indigo-400 transition hover:bg-indigo-600/15"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-[#1f2937] px-3 py-1 text-xs font-medium text-gray-400">
                Built for multi-branch operations
              </p>
              <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Operational intelligence for <span className="text-indigo-400">distributed teams</span>.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-400">
                Structured reporting, real-time KPIs, and AI-powered insights — one workspace for managers who need
                clarity, not chaos.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:bg-violet-500"
                >
                  Live Demo
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
                >
                  Sign in
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-lg border border-[#1f2937] bg-[#111827] px-6 py-3 text-sm font-semibold text-white transition hover:border-indigo-500/50"
                >
                  See how it works
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 shadow-2xl sm:p-8">
              <div className="flex items-center justify-between border-b border-[#1f2937] pb-4">
                <h2 className="text-lg font-semibold text-white">Live operations snapshot</h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  Healthy
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Open requests", "14"],
                  ["Pending submissions", "37"],
                  ["Unread threads", "9"],
                  ["Avg. occupancy", "82%"],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/80 px-3 py-3">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-white">{val}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-center text-xs text-gray-400">Real-time across all branches</p>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-[#1f2937] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold text-white">Everything your ops team needs</h2>
              <p className="mt-3 text-base text-gray-400">One platform. Every branch. Full visibility.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {[
                {
                  t: "Structured reporting",
                  d: "Daily, weekly, and custom forms with deadlines and submission tracking.",
                },
                {
                  t: "Real-time KPIs",
                  d: "Revenue, occupancy, and feedback signals across branches in one view.",
                },
                {
                  t: "Communication hub",
                  d: "Channels and threads linked to reports with unread attention signals.",
                },
                {
                  t: "AI insights & exports",
                  d: "Chat with your data and export management-ready PDFs and spreadsheets.",
                },
              ].map((c) => (
                <div
                  key={c.t}
                  className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-indigo-500/40 sm:p-8"
                >
                  <div className="mb-3 h-10 w-10 rounded-lg bg-indigo-600/30 ring-1 ring-indigo-500/40" aria-hidden />
                  <h3 className="text-xl font-semibold text-white">{c.t}</h3>
                  <p className="mt-3 text-base leading-relaxed text-gray-400">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1f2937] py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-3xl font-semibold text-white">How it works</h2>
            <div className="mt-12 grid gap-10 lg:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Setup",
                  body: "Admins define branches, roles, and templates — minutes, not weeks.",
                },
                {
                  n: "02",
                  title: "Collect",
                  body: "Managers submit structured reports on time; late work is surfaced automatically.",
                },
                {
                  n: "03",
                  title: "Decide",
                  body: "Leadership reviews KPIs and AI summaries to act with confidence.",
                },
              ].map((s) => (
                <div key={s.n} className="text-center lg:text-left">
                  <p className="text-5xl font-bold text-[#1f2937] sm:text-6xl">{s.n}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-3 text-base text-gray-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[#1f2937] py-16">
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#1f2937] bg-[#111827] px-6 py-12 text-center sm:px-10 sm:py-14">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Ready to bring clarity to your operations?</h2>
            <p className="mt-3 text-base text-gray-400">Try the interactive demo or sign in to your workspace.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-violet-500"
              >
                Live Demo
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg border border-indigo-500/50 px-8 py-3.5 text-base font-semibold text-indigo-300 transition hover:bg-indigo-600/15"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#1f2937] py-8">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 text-sm text-gray-400 sm:flex-row sm:items-center sm:px-6 lg:px-8">
            <p>
              <span className="font-semibold text-white">BranchWise AI</span> © 2026
            </p>
            <p>Operational intelligence for distributed teams.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
