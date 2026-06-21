import { describe, expect, it } from "vitest";

import { parseOwnerFunction } from "@/lib/branch/issue-types";

describe("parseOwnerFunction", () => {
  it("maps legacy product/design/qa to gm_hq", () => {
    expect(parseOwnerFunction("produkt")).toBe("gm_hq");
    expect(parseOwnerFunction("design")).toBe("gm_hq");
    expect(parseOwnerFunction("qa")).toBe("gm_hq");
  });

  it("maps camping department names", () => {
    expect(parseOwnerFunction("rezeption")).toBe("rezeption");
    expect(parseOwnerFunction("sanitaer")).toBe("sanitaer");
    expect(parseOwnerFunction("gruenpflege")).toBe("gruenpflege");
    expect(parseOwnerFunction("gastro")).toBe("gastro");
  });
});
