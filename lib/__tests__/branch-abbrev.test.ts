import { describe, expect, it } from "vitest";

import { branchAbbrev, branchLetter, branchShortLabel } from "@/lib/staff/branch-abbrev";

describe("branch abbreviations", () => {
  it("uses location letter for AZUR Camping branches", () => {
    expect(branchLetter("AZUR Camping Regensburg")).toBe("R");
    expect(branchLetter("AZUR Camping Hannover")).toBe("H");
    expect(branchLetter("AZUR Camping Wertheim")).toBe("W");
  });

  it("builds short codes from brand and location", () => {
    expect(branchAbbrev("AZUR Camping Regensburg")).toBe("AZRE");
    expect(branchAbbrev("AZUR Camping Hannover")).toBe("AZHA");
  });

  it("strips brand prefix for compact labels", () => {
    expect(branchShortLabel("AZUR Camping Regensburg")).toBe("Regensburg");
  });
});
