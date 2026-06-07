"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { DAY_OF_WEEK_LABELS, formatDisplayDate, formatScheduleDay } from "@/lib/schedules/dates";
import type { TemplateType } from "@/lib/report-builder/template-fields";

type ScheduleRow = {
  id: string;
  template_id: string;
  template_title: string;
  template_type: string;
  branch_ids: string[];
  branch_names: string[];
  all_branches: boolean;
  day_of_week: number;
  period_length_days: number;
  due_after_days: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
};

type TemplateOption = { id: string; title: string; type: string };
type BranchOption = { id: string; name: string };

export function SchedulesClient({
  basePath,
  allowedTemplateTypes,
}: {
  basePath: "/dashboard" | "/hr";
  allowedTemplateTypes: readonly TemplateType[];
}) {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    template_id: "",
    all_branches: true,
    branch_ids: new Set<string>(),
    day_of_week: 1,
    period_length_days: 7,
    due_after_days: 3,
  });

  const activeTemplates = useMemo(
    () => templates.filter((t) => allowedTemplateTypes.includes(t.type as TemplateType)),
    [templates, allowedTemplateTypes],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, tRes, bRes] = await Promise.all([
        fetch("/api/schedules"),
        fetch("/api/templates"),
        fetch("/api/branches"),
      ]);
      const sJson = (await sRes.json()) as { schedules?: ScheduleRow[]; error?: string };
      const tJson = (await tRes.json()) as { templates?: TemplateOption[] };
      const bJson = (await bRes.json()) as { branches?: BranchOption[] };
      if (!sRes.ok) showToast(sJson.error ?? "Failed to load schedules", "error");
      else setSchedules(sJson.schedules ?? []);
      setTemplates(tJson.templates ?? []);
      setBranches(bJson.branches ?? []);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    const templateId = searchParams.get("template_id") ?? "";
    const allBranches = searchParams.get("all_branches") === "true";
    const branchIds = searchParams.get("branch_ids")?.split(",").filter(Boolean) ?? [];
    setForm((f) => ({
      ...f,
      template_id: templateId || f.template_id,
      all_branches: allBranches || branchIds.length === 0,
      branch_ids: new Set(branchIds),
    }));
    setModalOpen(true);
  }, [searchParams]);

  async function toggleActive(row: ScheduleRow) {
    const res = await fetch(`/api/schedules/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(j.error ?? "Update failed", "error");
      return;
    }
    showToast(row.is_active ? "Schedule paused" : "Schedule activated", "success");
    void load();
  }

  async function deleteSchedule(row: ScheduleRow) {
    if (!window.confirm(`Delete schedule for "${row.template_title}"?`)) return;
    const res = await fetch(`/api/schedules/${row.id}`, { method: "DELETE" });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(j.error ?? "Delete failed", "error");
      return;
    }
    showToast("Schedule deleted", "success");
    void load();
  }

  async function createSchedule() {
    if (!form.template_id) {
      showToast("Select a template", "error");
      return;
    }
    if (!form.all_branches && form.branch_ids.size === 0) {
      showToast("Select at least one branch", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: form.template_id,
          all_branches: form.all_branches,
          branch_ids: form.all_branches ? [] : [...form.branch_ids],
          day_of_week: form.day_of_week,
          period_length_days: form.period_length_days,
          due_after_days: form.due_after_days,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(j.error ?? "Create failed", "error");
        return;
      }
      showToast("Recurring schedule created", "success");
      setModalOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  function branchSummary(row: ScheduleRow) {
    if (row.all_branches) return "All branches";
    if (row.branch_names.length === 0) return "—";
    if (row.branch_names.length <= 2) return row.branch_names.join(", ");
    return `${row.branch_names.slice(0, 2).join(", ")} +${row.branch_names.length - 2}`;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Schedules</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Automatically send report requests to branches on a weekly cadence.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${basePath}/reports`}
            className="inline-flex h-10 items-center rounded-lg border border-gray-700 bg-gray-800 px-4 text-sm font-semibold text-white hover:bg-gray-700"
          >
            ← Reports
          </Link>
          <Button type="button" onClick={() => setModalOpen(true)}>
            New schedule
          </Button>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell as="th">Template</TableCell>
            <TableCell as="th">Runs on</TableCell>
            <TableCell as="th">Period</TableCell>
            <TableCell as="th">Due after</TableCell>
            <TableCell as="th">Branches</TableCell>
            <TableCell as="th">Next run</TableCell>
            <TableCell as="th">Status</TableCell>
            <TableCell as="th">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-[#9ca3af]">
                Loading…
              </TableCell>
            </TableRow>
          ) : schedules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-[#9ca3af]">
                No schedules yet. Create one to automate weekly report requests.
              </TableCell>
            </TableRow>
          ) : (
            schedules.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium text-white">{row.template_title}</TableCell>
                <TableCell>{formatScheduleDay(row.day_of_week)}</TableCell>
                <TableCell>{row.period_length_days} days</TableCell>
                <TableCell>{row.due_after_days} days</TableCell>
                <TableCell className="text-[#9ca3af]">{branchSummary(row)}</TableCell>
                <TableCell>{row.next_run_at ? formatDisplayDate(row.next_run_at) : "—"}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.is_active ? "bg-emerald-500/20 text-emerald-200" : "bg-[#374151] text-[#9ca3af]",
                    )}
                  >
                    {row.is_active ? "Active" : "Paused"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => void toggleActive(row)}>
                      {row.is_active ? "Pause" : "Activate"}
                    </Button>
                    <Button type="button" variant="danger" className="px-2 py-1 text-xs" onClick={() => void deleteSchedule(row)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Modal
        open={modalOpen}
        title="New recurring schedule"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void createSchedule()}>
              {saving ? "Saving…" : "Create schedule"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 pt-2">
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-[#9ca3af]">Template</span>
            <select
              value={form.template_id}
              onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            >
              <option value="">Choose…</option>
              {activeTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.type})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#e5e7eb]">
            <input
              type="checkbox"
              checked={form.all_branches}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  all_branches: e.target.checked,
                  branch_ids: e.target.checked ? new Set() : f.branch_ids,
                }))
              }
              className="size-4 rounded border-[#1f2937]"
            />
            All branches
          </label>

          {!form.all_branches ? (
            <ul className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {branches.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#1f2937] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.branch_ids.has(b.id)}
                      onChange={() =>
                        setForm((f) => {
                          const next = new Set(f.branch_ids);
                          if (next.has(b.id)) next.delete(b.id);
                          else next.add(b.id);
                          return { ...f, all_branches: false, branch_ids: next };
                        })
                      }
                    />
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Run every</span>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                {DAY_OF_WEEK_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Period length (days)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={form.period_length_days}
                onChange={(e) => setForm((f) => ({ ...f, period_length_days: Number(e.target.value) }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Due after (days)</span>
              <input
                type="number"
                min={1}
                max={14}
                value={form.due_after_days}
                onChange={(e) => setForm((f) => ({ ...f, due_after_days: Number(e.target.value) }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
