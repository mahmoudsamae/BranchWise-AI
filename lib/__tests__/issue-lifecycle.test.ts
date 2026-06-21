import { describe, expect, it } from "vitest";

import {
  closeIssueFields,
  isIssueClosed,
  normalizeLifecyclePatch,
  reopenIssueFields,
} from "@/lib/branch/issue-lifecycle";

describe("issue-lifecycle", () => {
  it("closes when workflowStatus is completed", () => {
    expect(normalizeLifecyclePatch({ workflowStatus: "completed" })).toEqual({
      status: "done",
      workflowStatus: "completed",
    });
  });

  it("closes when status is done", () => {
    expect(normalizeLifecyclePatch({ status: "done" })).toEqual({
      status: "done",
      workflowStatus: "completed",
    });
  });

  it("reopens with in_progress when status open after completed", () => {
    expect(
      normalizeLifecyclePatch({ status: "open" }, { status: "done", workflowStatus: "completed" }),
    ).toEqual({
      status: "open",
      workflowStatus: "in_progress",
    });
  });

  it("keeps non-completed workflow as open status", () => {
    expect(normalizeLifecyclePatch({ workflowStatus: "blocked" })).toEqual({
      status: "open",
      workflowStatus: "blocked",
    });
  });

  it("closeIssueFields and isIssueClosed", () => {
    expect(closeIssueFields()).toEqual({ status: "done", workflowStatus: "completed" });
    expect(reopenIssueFields()).toEqual({ status: "open", workflowStatus: "in_progress" });
    expect(isIssueClosed("done", "completed")).toBe(true);
    expect(isIssueClosed("open", "in_progress")).toBe(false);
  });
});
