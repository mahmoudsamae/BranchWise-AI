"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Link2, Loader2, RefreshCw } from "lucide-react";

import { BulkPolicyModal } from "@/components/company-forms/bulk-policy-modal";
import { CreateInviteModal } from "@/components/company-forms/create-invite-modal";
import { FormBuilder } from "@/components/company-forms/form-builder";
import { IncidentQrPanel } from "@/components/company-forms/incident-qr-panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { MODULE_CONFIG, type CompanyFormModule } from "@/lib/company-forms/modules";

type HubView = "templates" | "links" | "submissions" | "qr";

type InviteRow = {
  id: string;
  subject_name: string;
  template_title: string | null;
  status: string;
  link: string;
  created_at: string;
};

type SubmissionRow = {
  id: string;
  subject_name: string | null;
  template_title: string | null;
  branch_name: string | null;
  status: string;
  submitted_at: string;
  shift_date: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function FormHub({ module }: { module: CompanyFormModule }) {
  const cfg = MODULE_CONFIG[module];
  const apiBase = `/api/hr/company-forms/${module}`;
  const detailBase = cfg.hrPath;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [view, setView] = useState<HubView>(() => {
    const v = searchParams.get("view");
    if (v === "links" || v === "submissions" || v === "qr") return v;
    return "templates";
  });
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const setViewAndUrl = useCallback(
    (next: HubView) => {
      setView(next);
      const path = cfg.hrPath;
      if (next === "templates") router.replace(path);
      else router.replace(`${path}?view=${next}`);
    },
    [cfg.hrPath, router],
  );

  const loadInvites = useCallback(async () => {
    if (!cfg.supportsInvites) return;
    setLoadingInvites(true);
    try {
      const res = await fetch(`${apiBase}/invites`);
      const json = (await res.json()) as { invites?: InviteRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setInvites(json.invites ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoadingInvites(false);
    }
  }, [apiBase, cfg.supportsInvites, showToast]);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`${apiBase}/submissions`);
      const json = (await res.json()) as { submissions?: SubmissionRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSubmissions(json.submissions ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    if (view === "links") void loadInvites();
    if (view === "submissions") void loadSubmissions();
  }, [view, loadInvites, loadSubmissions]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{cfg.label}</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">{cfg.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.supportsBulkInvites ? (
            <Button type="button" variant="secondary" onClick={() => setBulkOpen(true)}>
              Bulk send
            </Button>
          ) : null}
          {cfg.supportsInvites ? (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              <Link2 className="size-4" /> New link
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[#1f2937] pb-4">
        <Button type="button" variant={view === "templates" ? "primary" : "secondary"} onClick={() => setViewAndUrl("templates")}>
          Templates
        </Button>
        {cfg.supportsInvites ? (
          <Button type="button" variant={view === "links" ? "primary" : "secondary"} onClick={() => setViewAndUrl("links")}>
            Links
          </Button>
        ) : null}
        {module === "incident" ? (
          <Button type="button" variant={view === "qr" ? "primary" : "secondary"} onClick={() => setViewAndUrl("qr")}>
            Branch QR codes
          </Button>
        ) : null}
        <Button type="button" variant={view === "submissions" ? "primary" : "secondary"} onClick={() => setViewAndUrl("submissions")}>
          Submissions
        </Button>
      </div>

      {view === "templates" ? <FormBuilder module={module} /> : null}
      {view === "qr" && module === "incident" ? <IncidentQrPanel /> : null}

      {view === "links" && cfg.supportsInvites ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadInvites()} disabled={loadingInvites}>
              <RefreshCw className={`size-4 ${loadingInvites ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Template</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Link</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invites.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.subject_name}</TableCell>
                  <TableCell>{inv.template_title ?? "—"}</TableCell>
                  <TableCell><Badge variant="gray">{inv.status}</Badge></TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void navigator.clipboard.writeText(inv.link)}>
                      <Copy className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {view === "submissions" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadSubmissions()} disabled={loadingSubmissions}>
              <RefreshCw className={`size-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {loadingSubmissions ? (
            <Loader2 className="size-4 animate-spin text-[#6b7280]" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Subject</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Branch</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.subject_name ?? "—"}</TableCell>
                    <TableCell>{s.template_title ?? "—"}</TableCell>
                    <TableCell>{s.branch_name ?? "—"}</TableCell>
                    <TableCell><Badge variant={s.status === "reviewed" || s.status === "acknowledged" ? "green" : "yellow"}>{s.status}</Badge></TableCell>
                    <TableCell>{formatDate(s.submitted_at)}</TableCell>
                    <TableCell>
                      <Link href={`${detailBase}/${s.id}`}>
                        <Button type="button" variant="secondary" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      <CreateInviteModal module={module} open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={() => view === "links" && void loadInvites()} />
      {module === "policy" ? (
        <BulkPolicyModal open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={() => view === "links" && void loadInvites()} />
      ) : null}
    </div>
  );
}
