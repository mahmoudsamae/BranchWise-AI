import { describe, expect, it } from "vitest";

import {
  daysOverdueFromDueDate,
  recipientRolesForDaysOverdue,
  shouldSkipSuperAdminAlert,
} from "@/lib/cron/overdue-alert-escalation";

describe("overdue-alert-escalation", () => {
  it("computes days overdue from due date", () => {
    expect(daysOverdueFromDueDate("2026-06-01", "2026-06-03")).toBe(2);
    expect(daysOverdueFromDueDate("2026-06-02", "2026-06-03")).toBe(1);
  });

  it("follows the escalation ladder", () => {
    expect(recipientRolesForDaysOverdue(1)).toEqual([]);
    expect(recipientRolesForDaysOverdue(2)).toEqual(["general_manager"]);
    expect(recipientRolesForDaysOverdue(3)).toEqual(["general_manager", "branch_manager"]);
    expect(recipientRolesForDaysOverdue(4)).toEqual([]);
    expect(recipientRolesForDaysOverdue(5)).toEqual(["super_admin"]);
    expect(recipientRolesForDaysOverdue(10)).toEqual(["super_admin"]);
  });

  it("throttles super admin alerts to every 3 days", () => {
    expect(shouldSkipSuperAdminAlert(null, "2026-06-08")).toBe(false);
    expect(shouldSkipSuperAdminAlert("2026-06-08T10:00:00.000Z", "2026-06-08")).toBe(true);
    expect(shouldSkipSuperAdminAlert("2026-06-07T10:00:00.000Z", "2026-06-08")).toBe(true);
    expect(shouldSkipSuperAdminAlert("2026-06-06T10:00:00.000Z", "2026-06-08")).toBe(true);
    expect(shouldSkipSuperAdminAlert("2026-06-05T10:00:00.000Z", "2026-06-08")).toBe(false);
  });
});
