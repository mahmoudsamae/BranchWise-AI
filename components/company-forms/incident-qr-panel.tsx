"use client";

import { Copy, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";

type BranchQr = {
  branch_id: string;
  branch_name: string;
  branch_code: string | null;
  link: string | null;
  is_active: boolean;
};

export function IncidentQrPanel() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<BranchQr[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/incident-qr");
      const json = (await res.json()) as { branches?: BranchQr[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setRows(json.branches ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function regenerate(branchId: string) {
    try {
      const res = await fetch("/api/hr/incident-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch_id: branchId }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      showToast("QR link regenerated", "success");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-[#6b7280]" />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#9ca3af]">
        Print or display these links as QR codes at each branch so staff can report incidents without logging in.
      </p>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Branch</TableCell>
            <TableCell>Incident link</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.branch_id}>
              <TableCell>{row.branch_name}</TableCell>
              <TableCell className="max-w-xs truncate font-mono text-xs text-[#a5b4fc]">
                {row.link ?? "Not generated yet"}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {row.link ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => void navigator.clipboard.writeText(row.link!)}>
                      <Copy className="size-4" />
                    </Button>
                  ) : null}
                  <Button type="button" variant="secondary" size="sm" onClick={() => void regenerate(row.branch_id)}>
                    <RefreshCw className="size-4" />
                    {row.link ? "Regenerate" : "Generate"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
