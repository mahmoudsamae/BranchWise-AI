import { describe, expect, it } from "vitest";

import type { OpsColumn } from "@/lib/branch-ops/columns";
import {
  OPS_RETURNED_AT_KEY,
  filterOpenLogRows,
  findReturnColumn,
  isRowReturned,
  mergeReturnPatch,
} from "@/lib/branch-ops/log-rows";

const COLUMNS: OpsColumn[] = [
  { id: "item", type: "select", label: "Gegenstand", required: true, options: ["Kabel", "Stift"] },
  { id: "returned", type: "boolean", label: "Zurückgegeben", required: false },
];

describe("log-rows", () => {
  it("finds optional boolean as return column", () => {
    expect(findReturnColumn(COLUMNS)?.id).toBe("returned");
  });

  it("filters out returned rows", () => {
    const rows = [
      { id: "1", data: { item: "Kabel", returned: false }, created_at: "2026-06-21T10:00:00Z" },
      { id: "2", data: { item: "Stift", returned: true }, created_at: "2026-06-21T11:00:00Z" },
    ];
    expect(filterOpenLogRows(rows, COLUMNS)).toHaveLength(1);
    expect(filterOpenLogRows(rows, COLUMNS)[0]?.id).toBe("1");
  });

  it("sets returned timestamp when marking returned", () => {
    const merged = mergeReturnPatch({ item: "Kabel", returned: false }, { returned: true }, COLUMNS);
    expect(isRowReturned(merged, findReturnColumn(COLUMNS))).toBe(true);
    expect(typeof merged[OPS_RETURNED_AT_KEY]).toBe("string");
  });
});
