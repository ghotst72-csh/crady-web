import { describe, it, expect } from "vitest";
import { buildTodaysActivitySummary } from "./todaysSummary";
import type { TodaysActivitySummaryInput } from "./data";

const EMPTY: TodaysActivitySummaryInput = {
  newActivityCount: 0,
  distributionToday: null,
  cradyHeadlineToday: null,
};

describe("buildTodaysActivitySummary", () => {
  it("returns null when there is no activity today (never fabricates a '0 updates' line)", () => {
    expect(buildTodaysActivitySummary(EMPTY, null, "en")).toBeNull();
  });

  it("builds the headline from a real count", () => {
    const result = buildTodaysActivitySummary({ ...EMPTY, newActivityCount: 5 }, null, "en");
    expect(result?.headline).toBe("5 updates today");
  });

  it("uses singular phrasing for exactly 1 update", () => {
    const result = buildTodaysActivitySummary({ ...EMPTY, newActivityCount: 1 }, null, "en");
    expect(result?.headline).toBe("1 update today");
  });

  it("includes distribution/price/outlook clauses only when each is real", () => {
    const input: TodaysActivitySummaryInput = {
      newActivityCount: 3,
      distributionToday: { amount: 0.42, exDate: "2026-08-06" },
      cradyHeadlineToday: "TSLY CRADY Score changed",
    };
    const result = buildTodaysActivitySummary(input, 1.8, "en");
    expect(result?.detail).toBe("Distribution confirmed · Price +1.8% · New CRADY outlook");
  });

  it("omits a clause when its underlying data is missing, never fabricating filler", () => {
    const result = buildTodaysActivitySummary({ ...EMPTY, newActivityCount: 2 }, null, "en");
    expect(result?.detail).toBeNull();
  });

  it("omits the price clause for a negligible move", () => {
    const result = buildTodaysActivitySummary({ ...EMPTY, newActivityCount: 1 }, 0.02, "en");
    expect(result?.detail).toBeNull();
  });

  it("renders Korean copy", () => {
    const input: TodaysActivitySummaryInput = {
      newActivityCount: 2,
      distributionToday: { amount: 0.42, exDate: "2026-08-06" },
      cradyHeadlineToday: null,
    };
    const result = buildTodaysActivitySummary(input, -2.5, "ko");
    expect(result?.headline).toBe("오늘 2건의 새 활동");
    expect(result?.detail).toBe("배당 확정 · 가격 -2.5%");
  });
});
