"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { AppRole } from "@/types/user";

type Row = {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  branch_id: string | null;
  branch_name: string | null;
  is_active: boolean;
  created_at: string;
};

type Branch = { id: string; name: string; location: string | null };

function roleLabel(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "general_manager":
      return "GM";
    case "hr":
      return "HR";
    case "branch_manager":
      return "Branch Manager";
    default:
      return role;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ToggleActive({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition",
        active ? "border-emerald-500/50 bg-emerald-600/40" : "border-[#374151] bg-[#374151]",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition",
          active ? "left-6" : "left-0.5",
        )}
      />
    </button>
  );
}

export default function AllUsersPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<Row | null>(null);
  const [resetUser, setResetUser] = useState<Row | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteUser, setDeleteUser] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    role: "general_manager" as AppRole,
    branch_id: "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
    return p.toString();
  }, [roleFilter, statusFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/users?${queryString}`);
      const data = (await res.json()) as { users?: Row[]; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Failed to load users", "error");
        setRows([]);
        return;
      }
      setRows(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }, [queryString, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/super-admin/branches");
      const data = (await res.json()) as { branches?: Branch[] };
      if (res.ok) setBranches(data.branches ?? []);
    })();
  }, []);

  function openEdit(u: Row) {
    setEditError(null);
    setEditUser(u);
    setEditForm({
      full_name: u.full_name ?? "",
      email: u.email,
      role: u.role,
      branch_id: u.branch_id ?? "",
      password: "",
    });
  }

  async function saveEdit() {
    if (!editUser) return;
    setSaving(true);
    setEditError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45_000);
    try {
      const body: Record<string, unknown> = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };
      if (editForm.role === "branch_manager") {
        body.branch_id = editForm.branch_id.trim() || editUser.branch_id || null;
      }
      if (editForm.password.trim()) body.password = editForm.password;

      const res = await fetch(`/api/super-admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        data = { error: res.ok ? undefined : "Invalid server response" };
      }

      if (!res.ok) {
        const msg =
          res.status === 504
            ? (data.error ??
              "Database timed out — verify NEXT_PUBLIC_SUPABASE_URL in .env.local and that Supabase is online.")
            : (data.error ?? "Update failed");
        setEditError(msg);
        showToast(msg, "error");
        return;
      }
      showToast("User updated", "success");
      setEditUser(null);
      void load();
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === "AbortError"
          ? "Request timed out. Check your connection and try again."
          : "Could not reach the server. Try again.";
      setEditError(msg);
      showToast(msg, "error");
    } finally {
      window.clearTimeout(timeout);
      setSaving(false);
    }
  }

  async function toggleActive(u: Row) {
    const next = !u.is_active;
    const res = await fetch(`/api/super-admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(data.error ?? "Could not update status", "error");
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, is_active: next } : r)));
    showToast(next ? "User activated" : "User deactivated", "success");
  }

  async function confirmResetPassword() {
    if (!resetUser) return;
    const new_password = resetPassword.trim();
    if (new_password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/users/${resetUser.id}/reset-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Reset failed", "error");
        return;
      }
      showToast("Password reset successfully", "success");
      setResetUser(null);
      setResetPassword("");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/users/${deleteUser.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Delete failed", "error");
        return;
      }
      showToast("User deactivated", "success");
      setDeleteUser(null);
      void load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#f9fafb]">All Users</h1>
        <p className="mt-2 text-base text-[#9ca3af]">Search, filter, and manage workspace accounts.</p>
      </div>

      <div className="flex flex-col flex-wrap gap-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4 sm:flex-row sm:items-end">
        <div className="min-w-[200px] flex-1">
          <Input label="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
        </div>
        <div className="grid min-w-[140px] gap-1.5">
          <span className="text-sm font-medium text-[#9ca3af]">Role</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
          >
            <option value="all">All</option>
            <option value="general_manager">GM</option>
            <option value="hr">HR</option>
            <option value="branch_manager">Branch Manager</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div className="grid min-w-[140px] gap-1.5">
          <span className="text-sm font-medium text-[#9ca3af]">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell as="th">Full Name</TableCell>
            <TableCell as="th">Email</TableCell>
            <TableCell as="th">Role</TableCell>
            <TableCell as="th">Branch</TableCell>
            <TableCell as="th">Status</TableCell>
            <TableCell as="th">Created</TableCell>
            <TableCell as="th">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[#9ca3af]">
                Loading…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-[#9ca3af]">
                No users match your filters.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-[#f9fafb]">{u.full_name ?? "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge tone={u.role}>{roleLabel(u.role)}</Badge>
                </TableCell>
                <TableCell className="text-[#9ca3af]">{u.role === "branch_manager" ? (u.branch_name ?? "—") : "—"}</TableCell>
                <TableCell>
                  <ToggleActive active={u.is_active} onToggle={() => void toggleActive(u)} />
                </TableCell>
                <TableCell className="text-[#9ca3af]">{formatDate(u.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="px-2 py-1 text-xs"
                      onClick={() => {
                        setResetPassword("");
                        setResetUser(u);
                      }}
                    >
                      Reset Password
                    </Button>
                    <Button type="button" variant="danger" className="px-2 py-1 text-xs" onClick={() => setDeleteUser(u)}>
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
        open={Boolean(editUser)}
        title="Edit user"
        onClose={() => {
          setEditUser(null);
          setEditError(null);
        }}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditUser(null);
                setEditError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 pt-2">
          {editError ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{editError}</div>
          ) : null}
          <Input label="Full Name" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-[#9ca3af]">Role</span>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as AppRole }))}
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
            >
              <option value="super_admin">Super Admin</option>
              <option value="general_manager">General Manager</option>
              <option value="hr">HR</option>
              <option value="branch_manager">Branch Manager</option>
            </select>
          </div>
          {editForm.role === "branch_manager" ? (
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Branch</span>
              <select
                value={editForm.branch_id}
                onChange={(e) => setEditForm((f) => ({ ...f, branch_id: e.target.value }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Input
            label="New password (optional)"
            type="password"
            autoComplete="new-password"
            value={editForm.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Leave blank to keep current"
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(resetUser)}
        title="Reset password"
        onClose={() => {
          setResetUser(null);
          setResetPassword("");
        }}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setResetUser(null);
                setResetPassword("");
              }}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void confirmResetPassword()}>
              {saving ? "Resetting…" : "Reset password"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 pt-2">
          <p className="text-sm text-[#9ca3af]">
            Set a new password for <span className="font-semibold text-[#f9fafb]">{resetUser?.email}</span>.
          </p>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteUser)}
        title="Delete user?"
        onClose={() => setDeleteUser(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" disabled={saving} onClick={() => void confirmDelete()}>
              {saving ? "Working…" : "Deactivate"}
            </Button>
          </>
        }
      >
        <p className="text-[#9ca3af]">
          Are you sure? This will deactivate <span className="font-semibold text-[#f9fafb]">{deleteUser?.email}</span> (soft delete — data
          retained).
        </p>
      </Modal>
    </div>
  );
}
