"use client";

import Link from "next/link";
import { AlertTriangle, FileText, Loader2, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/Badge";

type Staff360 = {
  documents: {
    id: string;
    label: string;
    expires_at: string | null;
    file_name: string | null;
    signed_url: string | null;
    expiring_soon: boolean;
    expired: boolean;
  }[];
  onboarding: { id: string; status: string; submitted_at: string }[];
  company_forms: { id: string; module: string; title: string; status: string; submitted_at: string }[];
  policies: { id: string; title: string; status: string; submitted_at: string | null }[];
  summary: {
    document_count: number;
    expiring_documents: number;
    expired_documents: number;
    pending_policies: number;
    onboarding_count: number;
  };
};

export function Staff360Panel({ staffId }: { staffId: string }) {
  const [data, setData] = useState<Staff360 | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/staff/${staffId}/360`);
      const json = (await res.json()) as Staff360;
      if (res.ok) setData(json);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loader2 className="size-4 animate-spin text-[#6b7280]" />;
  if (!data) return null;

  return (
    <div className="space-y-6 rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-[#a5b4fc]" />
        <h2 className="text-lg font-semibold text-white">Employee 360°</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Documents" value={data.summary.document_count} />
        <Stat label="Onboarding" value={data.summary.onboarding_count} />
        <Stat label="Expiring docs" value={data.summary.expiring_documents} warn={data.summary.expiring_documents > 0} />
        <Stat label="Pending policies" value={data.summary.pending_policies} warn={data.summary.pending_policies > 0} />
      </div>

      {data.documents.length > 0 ? (
        <section>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#9ca3af]">
            <FileText className="size-4" /> Documents
          </h3>
          <ul className="space-y-2">
            {data.documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#1f2937] px-3 py-2 text-sm">
                <span className="text-white">{doc.label}</span>
                <div className="flex items-center gap-2">
                  {doc.expired ? <Badge variant="red">Expired</Badge> : null}
                  {doc.expiring_soon ? <Badge variant="yellow">Expiring soon</Badge> : null}
                  {doc.expires_at ? <span className="text-[#6b7280]">{doc.expires_at}</span> : null}
                  {doc.signed_url ? (
                    <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="text-[#a5b4fc] hover:underline">
                      {doc.file_name ?? "Download"}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.onboarding.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#9ca3af]">Onboarding</h3>
          {data.onboarding.map((o) => (
            <Link key={o.id} href={`/hr/onboarding/${o.id}`} className="block text-sm text-[#a5b4fc] hover:underline">
              Submission · {o.status} · {new Date(o.submitted_at).toLocaleDateString("de-DE")}
            </Link>
          ))}
        </section>
      ) : null}

      {data.policies.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#9ca3af]">Policies</h3>
          <ul className="space-y-1 text-sm text-[#d1d5db]">
            {data.policies.map((p) => (
              <li key={p.id}>
                {p.title} — <Badge variant={p.status === "acknowledged" || p.status === "submitted" ? "green" : "gray"}>{p.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.company_forms.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-[#9ca3af]">Other forms</h3>
          <ul className="space-y-1 text-sm">
            {data.company_forms.map((f) => (
              <li key={f.id}>
                <Link href={`/hr/${f.module === "document_renewal" ? "document-renewal" : f.module === "shift_handover" ? "shift-handover" : f.module}/${f.id}`} className="text-[#a5b4fc] hover:underline">
                  {f.title} ({f.module}) — {f.status}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.summary.expired_documents > 0 ? (
        <p className="flex items-center gap-2 text-sm text-amber-400">
          <AlertTriangle className="size-4" />
          {data.summary.expired_documents} expired document(s) need renewal.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-amber-500/40 bg-amber-950/20" : "border-[#1f2937] bg-[#0a0f1e]/50"}`}>
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
