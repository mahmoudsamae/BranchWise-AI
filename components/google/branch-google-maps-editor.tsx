"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { extractPlaceId, isUnsupportedCidGoogleMapsUrl } from "@/lib/google/extract-place-id";

type Props = {
  branchId: string;
  branchName: string;
  branchLocation?: string | null;
  initialUrl: string | null;
  initialPlaceId: string | null;
  onSaved?: () => void;
};

export function BranchGoogleMapsEditor({
  branchId,
  branchName,
  branchLocation,
  initialUrl,
  initialPlaceId,
  onSaved,
}: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [placeId, setPlaceId] = useState(initialPlaceId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const cidWarning = useMemo(() => isUnsupportedCidGoogleMapsUrl(url), [url]);
  const previewPlaceId = useMemo(() => (url.trim() ? extractPlaceId(url) : null), [url]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/branches/${branchId}/google`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_maps_url: url.trim() || null }),
      });
      const j = (await res.json()) as {
        error?: string;
        branch?: { google_maps_url?: string | null; google_place_id?: string | null };
      };
      if (!res.ok) {
        setMessage({ type: "err", text: j.error ?? "Speichern fehlgeschlagen" });
        return;
      }
      setUrl(j.branch?.google_maps_url ?? "");
      setPlaceId(j.branch?.google_place_id ?? null);
      setMessage({ type: "ok", text: `Gespeichert für „${branchName}".` });
      onSaved?.();
    } catch {
      setMessage({ type: "err", text: "Anfrage fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#111827]">
      <header className="border-b border-[#1f2937] bg-[#0a0f1e]/60 px-6 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
            <Building2 className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-white">{branchName}</h2>
            {branchLocation ? (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-[#9ca3af]">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {branchLocation}
              </p>
            ) : null}
            <p className="mt-1 font-mono text-xs text-[#6b7280]">Filiale-ID: {branchId}</p>
          </div>
          {placeId ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
              Verknüpft
            </span>
          ) : (
            <span className="rounded-full bg-gray-700/80 px-3 py-1 text-xs font-medium text-gray-300">Offen</span>
          )}
        </div>
      </header>

      <div className="p-6">
        <p className="text-sm text-[#9ca3af]">
          Google-Maps-Link oder Place-ID (ChIJ…) <strong className="text-[#d1d5db]">nur für diese Filiale</strong>.
          Gespeichert in der Datenbank mit dem oben genannten Filialdatensatz.
        </p>

        {placeId ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            Place-ID: <code className="break-all text-emerald-200">{placeId}</code>
          </p>
        ) : (
          <p className="mt-3 text-sm text-[#6b7280]">Noch kein Google-Link für diese Filiale.</p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm text-[#9ca3af]">
            Google Maps Link oder Place-ID
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/…"
              className="mt-1 block w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            />
          </label>

          {cidWarning ? (
            <p className="text-sm text-amber-400">
              Links mit <code className="text-amber-200">?cid=</code> werden nicht unterstützt. Bitte den Teilen-Link von
              Google Maps verwenden (mit Place-ID ChIJ…).
            </p>
          ) : null}

          {!cidWarning && previewPlaceId && previewPlaceId !== placeId ? (
            <p className="text-xs text-[#6b7280]">
              Erkannte Place-ID: <code className="text-[#a5b4fc]">{previewPlaceId}</code>
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={saving || cidWarning} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Für „{branchName}" speichern
            </Button>
            {url.trim() || placeId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setUrl("");
                  void (async () => {
                    setSaving(true);
                    setMessage(null);
                    try {
                      const res = await fetch(`/api/branches/${branchId}/google`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ google_maps_url: null }),
                      });
                      const j = (await res.json()) as { error?: string };
                      if (!res.ok) {
                        setMessage({ type: "err", text: j.error ?? "Entfernen fehlgeschlagen" });
                        return;
                      }
                      setPlaceId(null);
                      setMessage({ type: "ok", text: `Verknüpfung für „${branchName}" entfernt.` });
                      onSaved?.();
                    } catch {
                      setMessage({ type: "err", text: "Anfrage fehlgeschlagen" });
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              >
                Verknüpfung entfernen
              </Button>
            ) : null}
          </div>
        </div>

        {message ? (
          <p className={`mt-3 text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
        ) : null}
      </div>
    </article>
  );
}
