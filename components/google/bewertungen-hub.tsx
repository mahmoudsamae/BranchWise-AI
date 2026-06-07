"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Star } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BranchGoogleMapsEditor } from "@/components/google/branch-google-maps-editor";
import { GoogleApiStatusBanner } from "@/components/google/google-api-status-banner";
import { GoogleReviewsPanel } from "@/components/google/google-reviews-panel";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { GoogleReviewsAnalytics, GoogleReviewsPayload } from "@/lib/google/places-reviews";

type BranchSummary = {
  id: string;
  name: string;
  location: string | null;
  google_maps_url: string | null;
  google_place_id: string | null;
  linked: boolean;
  status: "live" | "demo" | "unlinked" | "error";
  isDemo: boolean;
  rating: number | null;
  userRatingCount: number | null;
  error?: string;
  detail?: {
    reviews: GoogleReviewsPayload["reviews"];
    analytics: GoogleReviewsAnalytics;
    displayName: string | null;
  };
};

type HubTab = "overview" | "settings";

type FilterStatus = "all" | "linked" | "unlinked" | "demo";

export function BewertungenHub() {
  const [hubTab, setHubTab] = useState<HubTab>("overview");
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [mockMode, setMockMode] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<"rating_desc" | "rating_asc" | "count_desc" | "name">("rating_desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPayload, setDetailPayload] = useState<(GoogleReviewsPayload & { isDemo?: boolean }) | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/bewertungen", { cache: "no-store" });
      const j = (await res.json()) as {
        branches?: BranchSummary[];
        mockMode?: boolean;
        apiKeyConfigured?: boolean;
        error?: string;
      };
      setBranches(j.branches ?? []);
      setMockMode(Boolean(j.mockMode));
      setApiKeyConfigured(Boolean(j.apiKeyConfigured));
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (branchId: string) => {
    setDetailLoading(true);
    setDetailPayload(null);
    try {
      const res = await fetch(`/api/dashboard/bewertungen?branch_id=${encodeURIComponent(branchId)}`, {
        cache: "no-store",
      });
      const j = (await res.json()) as { branches?: BranchSummary[] };
      const b = j.branches?.[0];
      if (b?.detail) {
        setDetailPayload({
          placeId: b.google_place_id ?? "",
          displayName: b.detail.displayName ?? b.name,
          rating: b.rating,
          userRatingCount: b.userRatingCount,
          reviews: b.detail.reviews,
          analytics: b.detail.analytics,
          isDemo: b.isDemo,
        });
      } else {
        const rev = await fetch(`/api/branches/${branchId}/reviews`, { cache: "no-store" });
        const rj = (await rev.json()) as GoogleReviewsPayload & { isDemo?: boolean; configured?: boolean };
        if (rj && "reviews" in rj) {
          setDetailPayload({
            placeId: rj.placeId,
            displayName: rj.displayName,
            rating: rj.rating,
            userRatingCount: rj.userRatingCount,
            reviews: rj.reviews,
            analytics: rj.analytics,
            isDemo: rj.isDemo,
          });
        }
      }
    } catch {
      setDetailPayload(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetailPayload(null);
  }, [selectedId, loadDetail]);

  const filtered = useMemo(() => {
    let list = [...branches];
    if (filterBranch !== "all") list = list.filter((b) => b.id === filterBranch);
    if (filterStatus === "linked") list = list.filter((b) => b.linked && !b.isDemo);
    if (filterStatus === "unlinked") list = list.filter((b) => !b.linked && b.status === "unlinked");
    if (filterStatus === "demo") list = list.filter((b) => b.isDemo || b.status === "demo");

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "de");
      if (sortBy === "rating_asc") return (a.rating ?? 0) - (b.rating ?? 0);
      if (sortBy === "count_desc") return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    return list;
  }, [branches, filterBranch, filterStatus, sortBy]);

  const compareChart = useMemo(() => {
    return filtered
      .filter((b) => b.rating != null)
      .map((b) => ({
        name: b.name.length > 18 ? `${b.name.slice(0, 16)}…` : b.name,
        rating: b.rating ?? 0,
        fill: b.isDemo ? "#6366f1" : "#22c55e",
      }));
  }, [filtered]);

  const avgRating = useMemo(() => {
    const rated = filtered.filter((b) => b.rating != null);
    if (!rated.length) return null;
    return rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Google Bewertungen</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">
          Alle Filialen im Überblick — vergleichen, filtern und Google-Links zentral verwalten.
          {mockMode ? (
            <span className="ml-2 rounded bg-indigo-500/20 px-2 py-0.5 text-indigo-200">Demo-Modus aktiv</span>
          ) : null}
        </p>
      </header>

      <div className="flex gap-2 border-b border-[#1f2937] pb-1">
        {(
          [
            ["overview", "Übersicht"],
            ["settings", "Einstellungen"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setHubTab(key)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition",
              hubTab === key ? "bg-[#111827] text-white" : "text-[#9ca3af] hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {hubTab === "settings" ? (
        <div className="space-y-6">
          <GoogleApiStatusBanner apiKeyConfigured={apiKeyConfigured} mockMode={mockMode} />

          <p className="text-sm text-[#9ca3af]">
            Jede Karte unten gehört zu <strong className="text-[#d1d5db]">genau einer Filiale</strong>. Der Link wird in
            der Datenbank mit dieser Filiale verknüpft (Place-ID wird automatisch extrahiert).
          </p>

          {loading ? (
            <div className="flex gap-2 text-[#9ca3af]">
              <Loader2 className="size-5 animate-spin" /> Laden…
            </div>
          ) : (
            <div className="space-y-8">
              {branches.map((b) => (
                <BranchGoogleMapsEditor
                  key={b.id}
                  branchId={b.id}
                  branchName={b.name}
                  branchLocation={b.location}
                  initialUrl={b.google_maps_url}
                  initialPlaceId={b.google_place_id}
                  onSaved={() => void loadList()}
                />
              ))}
              {branches.length === 0 ? <p className="text-[#6b7280]">Keine aktiven Filialen.</p> : null}
            </div>
          )}
        </div>
      ) : (
        <>
          <section className="flex flex-wrap gap-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <label className="text-sm text-[#9ca3af]">
              Filiale
              <select
                value={filterBranch}
                onChange={(e) => {
                  setFilterBranch(e.target.value);
                  setSelectedId(e.target.value === "all" ? null : e.target.value);
                }}
                className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="all">Alle Filialen</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-[#9ca3af]">
              Status
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="all">Alle</option>
                <option value="linked">Verknüpft (Live)</option>
                <option value="demo">Demo / Vorschau</option>
                <option value="unlinked">Ohne Link</option>
              </select>
            </label>
            <label className="text-sm text-[#9ca3af]">
              Sortierung
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="rating_desc">Beste Bewertung zuerst</option>
                <option value="rating_asc">Niedrigste zuerst</option>
                <option value="count_desc">Meiste Bewertungen</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button type="button" variant="secondary" size="sm" onClick={() => void loadList()}>
                Aktualisieren
              </Button>
            </div>
          </section>

          {avgRating != null ? (
            <p className="text-sm text-[#9ca3af]">
              Durchschnitt (gefiltert): <strong className="text-white">{avgRating.toFixed(2)}</strong> ★ über{" "}
              {filtered.filter((b) => b.rating != null).length} Filialen
            </p>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-12 text-[#9ca3af]">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
                <h2 className="mb-4 text-lg font-semibold text-white">Vergleich der Filialen</h2>
                <div className="h-64">
                  {compareChart.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={compareChart}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
                        <YAxis domain={[0, 5]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
                        <Bar dataKey="rating" radius={[4, 4, 0, 0]}>
                          {compareChart.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-[#6b7280]">Keine Bewertungsdaten für den Filter.</p>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#6b7280]">Grün = Live · Indigo = Demo-Vorschau</p>
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                {filtered.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn(
                      "rounded-xl border p-5 text-left transition hover:border-[#4f46e5]",
                      selectedId === b.id ? "border-[#6366f1] bg-[#111827]" : "border-[#1f2937] bg-[#111827]/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{b.name}</p>
                        {b.location ? <p className="text-xs text-[#6b7280]">{b.location}</p> : null}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded px-2 py-0.5 text-xs",
                          b.status === "live" && "bg-emerald-500/20 text-emerald-200",
                          b.status === "demo" && "bg-indigo-500/20 text-indigo-200",
                          b.status === "unlinked" && "bg-gray-700 text-gray-300",
                          b.status === "error" && "bg-red-500/20 text-red-200",
                        )}
                      >
                        {b.status === "live" ? "Live" : b.status === "demo" ? "Demo" : b.status === "error" ? "Fehler" : "Offen"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end gap-3">
                      <p className="text-3xl font-bold text-white">{b.rating != null ? b.rating.toFixed(1) : "—"}</p>
                      {b.rating != null ? (
                        <span className="inline-flex text-amber-400">
                          <Star className="size-4 fill-amber-400" aria-hidden />
                        </span>
                      ) : null}
                      <p className="text-sm text-[#9ca3af]">
                        {b.userRatingCount != null ? `${b.userRatingCount} Bewertungen` : "—"}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-[#a5b4fc]">Details anzeigen →</p>
                  </button>
                ))}
              </div>

              {selectedId ? (
                <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-white">
                      {branches.find((b) => b.id === selectedId)?.name ?? "Filiale"}
                    </h2>
                    <Link
                      href={`/dashboard/branches/${selectedId}`}
                      className="inline-flex items-center gap-1 text-sm text-[#a5b4fc] hover:underline"
                    >
                      <Building2 className="size-4" aria-hidden />
                      Zur Filialseite
                    </Link>
                  </div>
                  {detailLoading || !detailPayload ? (
                    <div className="flex justify-center py-12 text-[#9ca3af]">
                      <Loader2 className="size-6 animate-spin" />
                    </div>
                  ) : (
                    <GoogleReviewsPanel
                      payload={detailPayload}
                      isDemo={detailPayload.isDemo}
                      onRefresh={() => void loadDetail(selectedId)}
                      compact
                    />
                  )}
                </section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
