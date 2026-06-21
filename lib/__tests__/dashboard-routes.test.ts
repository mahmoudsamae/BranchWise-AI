import { describe, expect, it } from "vitest";



import { gmDashboardLegacyRedirect } from "@/lib/gm-hr/dashboard-routes";



describe("dashboard-routes", () => {

  it("redirects legacy GM pages", () => {

    expect(gmDashboardLegacyRedirect("/dashboard/analytics")).toBe("/dashboard");

    expect(gmDashboardLegacyRedirect("/dashboard/ki-chat")).toBe("/dashboard");

    expect(gmDashboardLegacyRedirect("/dashboard/schedules")).toBe("/dashboard");

  });



  it("allows GM nav and detail routes", () => {

    expect(gmDashboardLegacyRedirect("/dashboard")).toBeNull();

    expect(gmDashboardLegacyRedirect("/dashboard/branches/abc")).toBeNull();

    expect(gmDashboardLegacyRedirect("/dashboard/reports/r1")).toBeNull();

    expect(gmDashboardLegacyRedirect("/dashboard/fruhstuck")).toBeNull();

  });

});

