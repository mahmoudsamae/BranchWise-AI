import { describe, expect, it } from "vitest";

import { dedupeReportsByRequest } from "@/lib/reports/dedupe-by-request";

describe("dedupeReportsByRequest", () => {
  it("keeps submitted over draft for the same request", () => {
    const out = dedupeReportsByRequest([
      { id: "a", request_id: "req-1", status: "draft", updated_at: "2026-06-07T10:00:00Z" },
      { id: "b", request_id: "req-1", status: "submitted", updated_at: "2026-06-07T09:00:00Z" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("b");
  });

  it("keeps the newest row when status rank matches", () => {
    const out = dedupeReportsByRequest([
      { id: "a", request_id: "req-1", status: "submitted", updated_at: "2026-06-07T08:00:00Z" },
      { id: "b", request_id: "req-1", status: "submitted", updated_at: "2026-06-07T10:00:00Z" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("b");
  });
});
