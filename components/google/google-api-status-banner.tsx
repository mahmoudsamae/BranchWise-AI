"use client";

import { KeyRound } from "lucide-react";

type Props = {
  apiKeyConfigured: boolean;
  mockMode: boolean;
};

export function GoogleApiStatusBanner({ apiKeyConfigured, mockMode }: Props) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        apiKeyConfigured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <div className="flex flex-wrap items-start gap-3">
        <KeyRound className={`size-5 shrink-0 ${apiKeyConfigured ? "text-emerald-400" : "text-amber-400"}`} aria-hidden />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-white">Google Places API (systemweit)</p>
          {apiKeyConfigured ? (
            <p className="mt-1 text-[#9ca3af]">
              API-Schlüssel ist hinterlegt. Live-Bewertungen sind möglich, sobald pro Filiale ein Google-Link gespeichert
              ist.
            </p>
          ) : (
            <p className="mt-1 text-[#9ca3af]">
              Der API-Schlüssel wird vom <strong className="text-[#d1d5db]">Super Admin</strong> unter{" "}
              <strong className="text-[#d1d5db]">Integrationen</strong> im Super-Admin-Bereich gespeichert (Datenbank,
              nicht .env.local).
              {mockMode ? (
                <span className="mt-2 block text-indigo-200">Aktuell: Demo-Vorschau für alle Filialen aktiv.</span>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
