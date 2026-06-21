import { describe, expect, it } from "vitest";

import { buildTeamRows, formatCampchefCount } from "@/lib/gm-hr/team-query";

describe("team-query", () => {
  const branches = [
    { id: "b1", name: "Regensburg", location: "Regensburg" },
    { id: "b2", name: "Bodensee", location: "FN" },
  ];

  it("lists all campchefs per branch", () => {
    const rows = buildTeamRows(branches, [
      { id: "u1", full_name: "Anna A", email: "a@test.de", branch_id: "b1", is_active: true },
      { id: "u2", full_name: "Ben B", email: "b@test.de", branch_id: "b1", is_active: true },
      { id: "u3", full_name: "Carl C", email: "c@test.de", branch_id: "b2", is_active: true },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.branchId === "b1")).toHaveLength(2);
  });

  it("placeholder when branch has no campchef", () => {
    const rows = buildTeamRows(branches, []);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.managerName).toBe("—");
  });

  it("formatCampchefCount", () => {
    expect(formatCampchefCount(1)).toBe("1 Campchef");
    expect(formatCampchefCount(2)).toBe("2 Campchefs");
  });
});
