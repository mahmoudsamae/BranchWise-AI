import Link from "next/link";
import { notFound } from "next/navigation";

import { BranchDetailTabs } from "@/components/dashboard/branch-detail-tabs";
import { BranchExternalIdEditor } from "@/components/dashboard/branch-external-id-editor";
import { BranchGoogleReviews } from "@/components/google/branch-google-reviews";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { formatBranchManagerList } from "@/lib/gm-hr/team-query";
import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";
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
    .select("period_end, revenue, occupancy_rate, created_at")
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

  return (
    <div className="space-y-8">
      <Link href="/dashboard/branches" className="text-sm text-[#a5b4fc] hover:underline">
        ← Filialen
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-white">{branch.name}</h1>
        {branch.location ? <p className="text-[#9ca3af]">{branch.location}</p> : null}
        {campchefs !== "—" ? (
          <p className="mt-2 text-sm text-[#d1d5db]">Campchef: {campchefs}</p>
        ) : null}
      </header>

      <BranchDetailTabs
        overview={
          <div className="space-y-8">
            <BranchExternalIdEditor branchId={branch.id} initialSlug={branch.external_id} />

            <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
              <h2 className="mb-3 text-lg font-semibold text-white">KPI-Verlauf (aktuell)</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell as="th">Periodenende</TableCell>
              <TableCell as="th">Umsatz</TableCell>
              <TableCell as="th">Auslastung</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(kpis ?? []).map((k) => (
              <TableRow key={k.created_at}>
                <TableCell>{k.period_end}</TableCell>
                <TableCell>{k.revenue != null ? `€${k.revenue}` : "—"}</TableCell>
                <TableCell>{k.occupancy_rate != null ? `${k.occupancy_rate}%` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Berichte</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell as="th">Template</TableCell>
              <TableCell as="th">Status</TableCell>
              <TableCell as="th">Submitted</TableCell>
              <TableCell as="th">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(reports ?? []).map((r) => {
              const tpl = r.templates as { title?: string } | null;
              return (
                <TableRow key={r.id}>
                  <TableCell>{tpl?.title ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reportStatusClass(String(r.status))}`}>
                      {reportStatusLabel(String(r.status))}
                    </span>
                  </TableCell>
                  <TableCell>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</TableCell>
                  <TableCell>
                    <Link href={`/dashboard/reports/${r.id}`} className="text-[#a5b4fc] hover:underline">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Recent communication</h2>
        <ul className="space-y-2 text-sm text-[#d1d5db]">
          {(messages ?? []).map((m, i) => {
            const u = m.users as { full_name?: string; email?: string } | null;
            return (
              <li key={i} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/50 px-3 py-2">
                <span className="text-xs text-[#6b7280]">{u?.full_name || u?.email} · {new Date(m.created_at).toLocaleString()}</span>
                <p className="mt-1">{m.body}</p>
              </li>
            );
          })}
          {(messages ?? []).length === 0 ? <li className="text-[#6b7280]">No messages yet.</li> : null}
        </ul>
      </section>
          </div>
        }
        bewertungen={<BranchGoogleReviews branchId={branch.id} />}
      />
    </div>
  );
}
