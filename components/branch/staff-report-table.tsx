"use client";

import { useEffect, useState } from "react";

export type StaffEntryRow = {
  staff_member_id: string;
  full_name: string;
  position: string;
  hours_worked: number;
  overtime_hours: number;
  absences: number;
  late_arrivals: number;
  notes: string;
};

export function StaffReportTable({
  readOnly,
  value,
  onChange,
}: {
  readOnly?: boolean;
  value: StaffEntryRow[];
  onChange: (rows: StaffEntryRow[]) => void;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (value.length > 0) {
      setLoading(false);
      return;
    }
    void fetch("/api/branch/staff")
      .then((r) => r.json())
      .then((j: { staff?: { id: string; full_name: string; position: string }[] }) => {
        const rows: StaffEntryRow[] = (j.staff ?? []).map((s) => ({
          staff_member_id: s.id,
          full_name: s.full_name,
          position: s.position,
          hours_worked: 0,
          overtime_hours: 0,
          absences: 0,
          late_arrivals: 0,
          notes: "",
        }));
        onChange(rows);
      })
      .finally(() => setLoading(false));
  }, [onChange, value.length]);

  function updateRow(id: string, patch: Partial<StaffEntryRow>) {
    onChange(value.map((r) => (r.staff_member_id === id ? { ...r, ...patch } : r)));
  }

  if (loading && value.length === 0) {
    return <p className="text-sm text-[#9ca3af]">Loading staff…</p>;
  }

  if (value.length === 0) {
    return (
      <p className="text-sm text-amber-300">
        No active staff registered for this branch. Ask HR to add staff in the Staff Registry.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#1f2937]">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="bg-[#0a0f1e] text-xs uppercase text-[#6b7280]">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Hours</th>
            <th className="px-3 py-2">Overtime</th>
            <th className="px-3 py-2">Absences</th>
            <th className="px-3 py-2">Late</th>
            <th className="px-3 py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {value.map((row) => (
            <tr key={row.staff_member_id} className="border-t border-[#1f2937]/60">
              <td className="px-3 py-2">
                <p className="font-medium text-white">{row.full_name}</p>
                <p className="text-xs text-[#6b7280]">{row.position}</p>
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={row.hours_worked}
                  onChange={(e) =>
                    updateRow(row.staff_member_id, { hours_worked: Number(e.target.value) || 0 })
                  }
                  className="w-20 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-white"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={row.overtime_hours}
                  onChange={(e) =>
                    updateRow(row.staff_member_id, { overtime_hours: Number(e.target.value) || 0 })
                  }
                  className="w-20 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-white"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={row.absences}
                  onChange={(e) =>
                    updateRow(row.staff_member_id, { absences: Number(e.target.value) || 0 })
                  }
                  className="w-16 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-white"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={0}
                  disabled={readOnly}
                  value={row.late_arrivals}
                  onChange={(e) =>
                    updateRow(row.staff_member_id, { late_arrivals: Number(e.target.value) || 0 })
                  }
                  className="w-16 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-white"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  type="text"
                  disabled={readOnly}
                  value={row.notes}
                  onChange={(e) => updateRow(row.staff_member_id, { notes: e.target.value })}
                  className="min-w-[120px] rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-white"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
