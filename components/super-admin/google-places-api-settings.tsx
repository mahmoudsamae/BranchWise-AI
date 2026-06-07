"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function GooglePlacesApiSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [masked, setMasked] = useState<string | null>(null);
  const [source, setSource] = useState<string>("none");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/settings/google");
      const j = (await res.json()) as {
        configured?: boolean;
        masked?: string | null;
        source?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage({ type: "err", text: j.error ?? "Laden fehlgeschlagen" });
        return;
      }
      setConfigured(Boolean(j.configured));
      setMasked(j.masked ?? null);
      setSource(j.source ?? "none");
    } catch {
      setMessage({ type: "err", text: "Anfrage fehlgeschlagen" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/super-admin/settings/google", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey.trim() || null }),
      });
      const j = (await res.json()) as { error?: string; configured?: boolean; masked?: string | null };
      if (!res.ok) {
        setMessage({ type: "err", text: j.error ?? "Speichern fehlgeschlagen" });
        return;
      }
      setApiKey("");
      setConfigured(Boolean(j.configured));
      setMasked(j.masked ?? null);
      setSource("database");
      setMessage({ type: "ok", text: "API-Schlüssel gespeichert." });
    } catch {
      setMessage({ type: "err", text: "Anfrage fehlgeschlagen" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-[#a5b4fc]" aria-hidden />
        <h2 className="text-lg font-semibold text-white">Google Places API</h2>
      </div>
      <p className="mt-2 text-sm text-[#9ca3af]">
        Zentraler Schlüssel für alle Google-Bewertungen im System. Wird sicher in der Datenbank gespeichert (nicht in
        Git oder .env.local).
      </p>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#9ca3af]">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Laden…
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#d1d5db]">
            Status:{" "}
            <span className={configured ? "text-emerald-400" : "text-amber-400"}>
              {configured ? "Konfiguriert" : "Nicht konfiguriert"}
            </span>
            {masked ? (
              <>
                {" "}
                · <code className="text-[#9ca3af]">{masked}</code>
              </>
            ) : null}
            {source === "env_fallback" ? (
              <span className="ml-2 text-xs text-amber-300">(Fallback aus .env.local — bitte hier migrieren)</span>
            ) : null}
          </p>

          <label className="mt-4 block text-sm text-[#9ca3af]">
            Neuer API-Schlüssel
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              className="mt-1 block w-full max-w-lg rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Speichern
            </Button>
            {configured ? (
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setApiKey("");
                  void (async () => {
                    setSaving(true);
                    const res = await fetch("/api/super-admin/settings/google", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ api_key: null }),
                    });
                    const j = (await res.json()) as { error?: string };
                    setSaving(false);
                    if (!res.ok) {
                      setMessage({ type: "err", text: j.error ?? "Entfernen fehlgeschlagen" });
                      return;
                    }
                    setConfigured(false);
                    setMasked(null);
                    setMessage({ type: "ok", text: "API-Schlüssel aus der Datenbank entfernt." });
                  })();
                }}
              >
                Aus Datenbank entfernen
              </Button>
            ) : null}
          </div>
        </>
      )}

      {message ? (
        <p className={`mt-3 text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
