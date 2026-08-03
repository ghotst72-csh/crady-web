import { describe, it, expect } from "vitest";
import { buildActivityStreamEntries } from "./stream";
import type { ActivityItem, AutomatedActivityItem } from "./types";

const investorItem: ActivityItem = {
  id: "i1",
  ticker: "TSLY",
  source: "investor",
  type: "question",
  userId: "u1",
  parentId: null,
  title: "Will TSLY cut its dividend?",
  body: "...",
  replyCount: 0,
  editedAt: null,
  createdAt: "2026-08-03T10:00:00Z",
  author: { displayName: "Investor1", expertiseBadge: null },
};

const automatedItem: AutomatedActivityItem = {
  id: "a1",
  ticker: "TSLY",
  source: "crady",
  type: "score_change",
  title: "TSLY CRADY Score changed",
  body: "TSLY's CRADY Score moved from 34.1 to 38.2.",
  occurredAt: "2026-08-03T12:00:00Z",
  sourceUrl: "/tsly",
  supportingMetrics: { score: 38.2, previous_score: 34.1 },
  language: "en",
};

describe("buildActivityStreamEntries", () => {
  it("merges investor and automated entries in one chronological feed", () => {
    const entries = buildActivityStreamEntries(
      { ticker: "TSLY", riskCalculatedAt: null, topLevelItems: [investorItem], automatedItems: [automatedItem] },
      "en"
    );
    expect(entries.map((e) => e.id)).toEqual(["automated-a1", "investor-i1"]);
  });

  it("real automated rows use their own already-rendered title as the label, verbatim", () => {
    const entries = buildActivityStreamEntries(
      { ticker: "TSLY", riskCalculatedAt: null, topLevelItems: [], automatedItems: [automatedItem] },
      "en"
    );
    expect(entries[0].label).toBe("TSLY CRADY Score changed");
    expect(entries[0].source).toBe("crady");
    expect(entries[0].href).toBe("/tsly");
  });

  it("adds the AI Outlook pointer only when riskCalculatedAt is real, and never claims a specific change", () => {
    const withRisk = buildActivityStreamEntries(
      { ticker: "TSLY", riskCalculatedAt: "2026-08-03T09:00:00Z", topLevelItems: [], automatedItems: [] },
      "en"
    );
    expect(withRisk).toHaveLength(1);
    expect(withRisk[0].href).toBe("#ai-outlook");

    const withoutRisk = buildActivityStreamEntries(
      { ticker: "TSLY", riskCalculatedAt: null, topLevelItems: [], automatedItems: [] },
      "en"
    );
    expect(withoutRisk).toHaveLength(0);
  });

  it("respects the limit after sorting newest-first", () => {
    const many: AutomatedActivityItem[] = Array.from({ length: 12 }, (_, i) => ({
      ...automatedItem,
      id: `a${i}`,
      occurredAt: `2026-08-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const entries = buildActivityStreamEntries(
      { ticker: "TSLY", riskCalculatedAt: null, topLevelItems: [], automatedItems: many, limit: 5 },
      "en"
    );
    expect(entries).toHaveLength(5);
    expect(entries[0].id).toBe("automated-a11"); // most recent occurredAt first
  });
});
