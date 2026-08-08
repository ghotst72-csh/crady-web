import { describe, it, expect } from "vitest";
import { computeAllTimeDistributionStats } from "./distributionStats";

describe("computeAllTimeDistributionStats", () => {
  it("computes count/total/average/highest/lowest from real paid amounts", () => {
    const result = computeAllTimeDistributionStats([
      { pay_date: "2026-01-01", amount: 0.3 },
      { pay_date: "2026-02-01", amount: 0.5 },
      { pay_date: "2026-03-01", amount: 0.1 },
    ]);
    expect(result.count).toBe(3);
    expect(result.total).toBeCloseTo(0.9, 5);
    expect(result.average).toBeCloseTo(0.3, 5);
    expect(result.highest).toBe(0.5);
    expect(result.lowest).toBe(0.1);
  });

  it("ignores unpaid (null amount / TBD) rows", () => {
    const result = computeAllTimeDistributionStats([
      { pay_date: "2026-01-01", amount: 0.3 },
      { pay_date: "2026-02-01", amount: null },
    ]);
    expect(result.count).toBe(1);
    expect(result.total).toBeCloseTo(0.3, 5);
  });

  it("returns honest nulls when there is no real data", () => {
    const result = computeAllTimeDistributionStats([]);
    expect(result).toEqual({ count: 0, total: null, average: null, highest: null, lowest: null });
  });
});
