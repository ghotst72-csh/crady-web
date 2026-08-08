import { describe, it, expect } from "vitest";
import { ETF_WORKSPACE_TABS, DEFAULT_ETF_WORKSPACE_TAB, isEtfWorkspaceTabId } from "./workspaceTabs";

describe("workspaceTabs", () => {
  it("has exactly the five real tabs, in the spec's order", () => {
    expect(ETF_WORKSPACE_TABS.map((t) => t.id)).toEqual(["summary", "next-dividend", "history", "analysis", "community"]);
  });

  it("every tab has both EN and KO labels", () => {
    for (const t of ETF_WORKSPACE_TABS) {
      expect(t.label.en.length).toBeGreaterThan(0);
      expect(t.label.ko.length).toBeGreaterThan(0);
    }
  });

  it("defaults to summary", () => {
    expect(DEFAULT_ETF_WORKSPACE_TAB).toBe("summary");
  });

  it("isEtfWorkspaceTabId validates real ids only", () => {
    expect(isEtfWorkspaceTabId("history")).toBe(true);
    expect(isEtfWorkspaceTabId("bogus")).toBe(false);
    expect(isEtfWorkspaceTabId(null)).toBe(false);
    expect(isEtfWorkspaceTabId(undefined)).toBe(false);
  });
});
