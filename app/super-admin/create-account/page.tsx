"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { AppRole } from "@/types/user";

type Branch = { id: string; name: string; location: string | null };

const roles: { value: AppRole; label: string }[] = [
  { value: "general_manager", label: "General Manager" },
  { value: "hr", label: "HR" },
  { value: "branch_manager", label: "Branch Manager" },
];

function generatePassword12() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join("");
}

export default function CreateAccountPage() {
  const { showToast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("general_manager");
  const [branchMode, setBranchMode] = useState<"existing" | "new">("existing");
  const [branchId, setBranchId] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchLocation, setNewBranchLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);

  const loadBranches = useCallback(async () => {
    const res = await fetch("/api/super-admin/branches");
    const data = (await res.json()) as { branches?: Branch[]; error?: string };
    if (!res.ok) return;
    setBranches(data.branches ?? []);
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  function onGeneratePassword() {
    const p = generatePassword12();
    setPassword(p);
    void navigator.clipboard.writeText(p).then(
      () => showToast("Password generated and copied to clipboard", "success"),
      () => showToast("Password generated (clipboard unavailable)", "success"),
    );
  }

  async function onCreateBranchAssign() {
    const name = newBranchName.trim();
    if (!name) {
      showToast("Branch name is required", "error");
      return;
    }
    setCreatingBranch(true);
    try {
      const res = await fetch("/api/super-admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location: newBranchLocation.trim() || undefined }),
      });
      const data = (await res.json()) as { branch?: Branch; error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Failed to create branch", "error");
        return;
      }
      if (data.branch) {
        setBranches((prev) => [...prev, data.branch!].sort((a, b) => a.name.localeCompare(b.name)));
        setBranchId(data.branch.id);
        setBranchMode("existing");
        showToast("Branch created and selected", "success");
      }
    } finally {
      setCreatingBranch(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        full_name: fullName,
        email,
        password,
        role,
      };
      if (role === "branch_manager") {
        if (branchMode === "existing") {
          body.branch_id = branchId || null;
        } else if (newBranchName.trim()) {
          body.new_branch = { name: newBranchName.trim(), location: newBranchLocation.trim() || undefined };
        }
      }

      const res = await fetch("/api/super-admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "Create failed", "error");
        return;
      }
      showToast("Account created successfully", "success");
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("general_manager");
      setBranchMode("existing");
      setBranchId("");
      setNewBranchName("");
      setNewBranchLocation("");
      void loadBranches();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#f9fafb]">Create Account</h1>
        <p className="mt-2 text-base text-[#9ca3af]">Add a workspace user with email and password login.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-[#1f2937] bg-[#111827] p-6 sm:p-8">
        <Input label="Full Name" name="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />

        <Input label="Email" name="email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-[#9ca3af]">Password</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <input
              name="password"
              type="text"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-[42px] flex-1 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/40"
            />
            <Button type="button" variant="secondary" className="shrink-0 sm:w-auto" onClick={onGeneratePassword}>
              Generate
            </Button>
          </div>
          <p className="text-xs text-[#6b7280]">Generate copies a random 12-character password to your clipboard.</p>
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-[#9ca3af]">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as AppRole)}
            className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2.5 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {role === "branch_manager" ? (
          <div className="space-y-4 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
            <p className="text-sm font-semibold text-[#f9fafb]">Assign Branch</p>
            <div className="flex gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-[#9ca3af]">
                <input type="radio" checked={branchMode === "existing"} onChange={() => setBranchMode("existing")} />
                Select existing branch
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[#9ca3af]">
                <input type="radio" checked={branchMode === "new"} onChange={() => setBranchMode("new")} />
                Create new branch
              </label>
            </div>

            {branchMode === "existing" ? (
              <div className="grid gap-1.5">
                <label htmlFor="branch_id" className="text-sm font-medium text-[#9ca3af]">
                  Branch
                </label>
                <select
                  id="branch_id"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2.5 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
                  required={role === "branch_manager"}
                >
                  <option value="">Select branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.location ? ` — ${b.location}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <Input label="Branch Name" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} />
                <Input label="Branch Location" value={newBranchLocation} onChange={(e) => setNewBranchLocation(e.target.value)} />
                <Button type="button" variant="secondary" disabled={creatingBranch} onClick={() => void onCreateBranchAssign()}>
                  {creatingBranch ? "Creating…" : "Create branch & assign"}
                </Button>
                <p className="text-xs text-[#6b7280]">
                  Creates the branch in the database and selects it. Submit the form below to create the user.
                </p>
              </div>
            )}
          </div>
        ) : null}

        <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>
    </div>
  );
}
