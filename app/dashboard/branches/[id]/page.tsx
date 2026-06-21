import Link from "next/link";
import { notFound } from "next/navigation";

import { BranchDetailTabs } from "@/components/dashboard/branch-detail-tabs";
import { BranchExternalIdEditor } from "@/components/dashboard/branch-external-id-editor";
import { BranchReportsList } from "@/components/dashboard/branch-reports-list";
import { BranchGoogleReviews } from "@/components/google/branch-google-reviews";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { formatBranchManagerList } from "@/lib/gm-hr/team-query";
import { createServiceRoleClient } from "@/lib/supabase";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  const { data: branch } = await supabase
    .from("branches")
    .select("id, name, location, external_id")
    .eq("id", id)
    .maybeSingle();
  if (!branch) notFound();

  const { data: managers } = await supabase
    .from("users")
    .select("full_name, email, branch_id")
    .eq("branch_id", id)
    .eq("role", "branch_manager")
    .order("full_name");

  const campchefs = formatBranchManagerList(managers ?? [], id);

  const { data: kpis } = await supabase
    .from("kpis")
    .select("period_end, occupancy_rate, created_at")
    .eq("branch_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: reports } = await supabase
    .from("reports")
    .select("id, status, submitted_at, updated_at, template_id, templates(title)")
    .eq("branch_id", id)
    .order("updated_at", { ascending: false })
    .limit(20);

  const { data: channels } = await supabase.from("branch_channels").select("id").eq("branch_id", id);
  const channelIds = (channels ?? []).map((c) => c.id);
  const { data: messages } =
    channelIds.length > 0
      ? await supabase
          .from("branch_messages")
          .select("body, created_at, users(full_name, email)")
          .in("channel_id", channelIds)
          .order("created_at", { ascending: false })
          .limit(5)
      : { data: [] };

  const reportRows = (reports ?? []).map((r) => {
    const tpl = r.templates as { title?: string } | null;
    return {
      id: r.id as string,
      status: String(r.status),
      submitted_at: r.submitted_at as string | null,
      updated_at: String(r.updated_at),
      template_title: tpl?.title ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <Link href="/dashboard/branches" className="text-sm text-[var(--accent-light)] hover:underline">
        ← Filialen
      </Link>

      <header className="bw-card-accent p-6">
        <h1 className="text-2xl font-bold text-white">{branch.name}</h1>
        {branch.location ? <p className="mt-1 text-[var(--text-secondary)]">{branch.location}</p> : null}
        {campchefs !== "—" ? (
          <p className="mt-2 text-sm text-[#d1d5db]">Campchef: {campchefs}</p>
        ) : null}
      </header>

      <BranchDetailTabs
        overview={
          <div className="space-y-8">
            <BranchExternalIdEditor branchId={branch.id} initialSlug={branch.external_id} />

            <section className="bw-card p-6">
              <h2 className="bw-section-title mb-4">KPI-Verlauf (Auslastung)</h2>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell as="th">Periodenende</TableCell>
                    <TableCell as="th">Auslastung</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(kpis ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-[var(--text-muted)]">
                        Noch keine KPI-Daten
                      </TableCell>
                    </TableRow>
                  ) : (
                    (kpis ?? []).map((k) => (
                      <TableRow key={k.created_at}>
                        <TableCell>{k.period_end}</TableCell>
                        <TableCell>
                          {k.occupancy_rate != null ? (
                            <span className="font-medium text-[var(--accent-3)]">{k.occupancy_rate}%</span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>

            <section>
              <h2 className="bw-section-title mb-4">Berichte</h2>
              <BranchReportsList reports={reportRows} />
            </section>

            <section className="bw-card p-6">
              <h2 className="bw-section-title mb-4">Letzte Kommunikation</h2>
              <ul className="space-y-2 text-sm text-[#d1d5db]">
                {(messages ?? []).map((m, i) => {
                  const u = m.users as { full_name?: string; email?: string } | null;
                  return (
                    <li key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/50 px-3 py-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        {u?.full_name || u?.email} · {new Date(m.created_at).toLocaleString("de-DE")}
                      </span>
                      <p className="mt-1">{m.body}</p>
                    </li>
                  );
                })}
                {(messages ?? []).length === 0 ? (
                  <li className="text-[var(--text-muted)]">Noch keine Nachrichten.</li>
                ) : null}
              </ul>
            </section>
          </div>
        }
        bewertungen={<BranchGoogleReviews branchId={branch.id} />}
      />
    </div>
  );
}
