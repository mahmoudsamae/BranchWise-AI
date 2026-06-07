"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Link2, Loader2, RefreshCw } from "lucide-react";

import { CreateInviteModal } from "@/components/onboarding/create-invite-modal";
import { OnboardingBuilder } from "@/components/onboarding/onboarding-builder";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";

type HubView = "templates" | "links" | "submissions";

type InviteRow = {
  id: string;
  employee_name: string;
  template_title: string | null;
  status: string;
  link: string;
  created_at: string;
  submitted_at: string | null;
  expires_at: string;
};

type SubmissionRow = {
  id: string;
  employee_name: string | null;
  template_title: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
};

function parseView(raw: string | null): HubView {
  if (raw === "links" || raw === "submissions") return raw;
  return "templates";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadge(status: string) {
  if (status === "submitted" || status === "reviewed") return <Badge variant="green">{status}</Badge>;
  if (status === "expired") return <Badge variant="red">expired</Badge>;
  if (status === "in_progress") return <Badge variant="yellow">in progress</Badge>;
  return <Badge variant="gray">pending</Badge>;
}

export function OnboardingHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [view, setView] = useState<HubView>(() => parseView(searchParams.get("view")));
  const [inviteOpen, setInviteOpen] = useState(false);

  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    setView(parseView(searchParams.get("view")));
  }, [searchParams]);

  const setViewAndUrl = useCallback(
    (next: HubView) => {
      setView(next);
      const path = "/hr/onboarding";
      if (next === "templates") router.replace(path);
      else router.replace(`${path}?view=${next}`);
    },
    [router],
  );

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await fetch("/api/hr/onboarding/invites");
      const json = (await res.json()) as { invites?: InviteRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setInvites(json.invites ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load links", "error");
    } finally {
      setLoadingInvites(false);
    }
  }, [showToast]);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch("/api/hr/onboarding/submissions");
      const json = (await res.json()) as { submissions?: SubmissionRow[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setSubmissions(json.submissions ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load submissions", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (view === "links") void loadInvites();
    if (view === "submissions") void loadSubmissions();
  }, [view, loadInvites, loadSubmissions]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied", "success");
    } catch {
      showToast("Could not copy", "error");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Create templates, generate personal links for new hires, and review submitted documents in one place.
          </p>
        </div>
        <Button type="button" onClick={() => setInviteOpen(true)}>
          <Link2 className="size-4" />
          New employee link
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-[#1f2937] pb-4">
        <Button type="button" variant={view === "templates" ? "primary" : "secondary"} onClick={() => setViewAndUrl("templates")}>
          Templates
        </Button>
        <Button type="button" variant={view === "links" ? "primary" : "secondary"} onClick={() => setViewAndUrl("links")}>
          Links
        </Button>
        <Button type="button" variant={view === "submissions" ? "primary" : "secondary"} onClick={() => setViewAndUrl("submissions")}>
          Submissions
        </Button>
      </div>

      {view === "templates" ? <OnboardingBuilder /> : null}

      {view === "links" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadInvites()} disabled={loadingInvites}>
              <RefreshCw className={`size-4 ${loadingInvites ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          {loadingInvites ? (
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-[#6b7280]">No links yet. Create one with &quot;New employee link&quot;.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.employee_name}</TableCell>
                    <TableCell>{inv.template_title ?? "—"}</TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell>{formatDate(inv.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => void copyText(inv.link)}>
                          <Copy className="size-4" />
                        </Button>
                        {inv.status !== "submitted" ? (
                          <a href={inv.link} target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="ghost" size="sm">
                              <ExternalLink className="size-4" />
                            </Button>
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      {view === "submissions" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => void loadSubmissions()} disabled={loadingSubmissions}>
              <RefreshCw className={`size-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          {loadingSubmissions ? (
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-[#6b7280]">No submissions yet.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.employee_name ?? "—"}</TableCell>
                    <TableCell>{s.template_title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "reviewed" ? "green" : "yellow"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(s.submitted_at)}</TableCell>
                    <TableCell>
                      <Link href={`/hr/onboarding/${s.id}`}>
                        <Button type="button" variant="secondary" size="sm">
                          View dossier
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      <CreateInviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => {
          if (view === "links") void loadInvites();
        }}
      />
    </div>
  );
}
