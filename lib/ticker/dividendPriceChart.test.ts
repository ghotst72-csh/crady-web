import { describe, it, expect } from "vitest";
import {
  filterHistoryByRange,
  filterDistributionsByRange,
  computeChartWindowMetrics,
  computeEvenTicks,
} from "./dividendPriceChart";

const TODAY = "2026-08-07";

function history(days: number) {
  const out: { trade_date: string; close_price: number | null }[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(new Date(TODAY + "T00:00:00Z").getTime() - i * 86400000);
    out.push({ trade_date: d.toISOString().slice(0, 10), close_price: 20 + i * 0.01 });
  }
  return out;
}

describe("filterHistoryByRange", () => {
  it("ALL returns everything unfiltered", () => {
    const h = history(400);
    expect(filterHistoryByRange(h, "ALL", TODAY)).toHaveLength(h.length);
  });

  it("1M keeps only the last ~30 days", () => {
    const h = history(400);
    const filtered = filterHistoryByRange(h, "1M", TODAY);
    expect(filtered.length).toBeLessThan(35);
    expect(filtered.every((p) => p.trade_date >= "2026-07-08")).toBe(true);
  });

  it("1Y is wider than 6M which is wider than 3M", () => {
    const h = history(400);
    const y = filterHistoryByRange(h, "1Y", TODAY).length;
    const m6 = filterHistoryByRange(h, "6M", TODAY).length;
    const m3 = filterHistoryByRange(h, "3M", TODAY).length;
    expect(y).toBeGreaterThan(m6);
    expect(m6).toBeGreaterThan(m3);
  });
});

describe("filterDistributionsByRange", () => {
  const dists = [
    { pay_date: "2025-01-01", amount: 0.5 },
    { pay_date: "2026-06-01", amount: 0.4 },
    { pay_date: "2026-08-01", amount: 0.3 },
  ];

  it("ALL returns everything", () => {
    expect(filterDistributionsByRange(dists, "ALL", TODAY)).toHaveLength(3);
  });

  it("3M excludes distributions paid over 90 days ago", () => {
    const filtered = filterDistributionsByRange(dists, "3M", TODAY);
    expect(filtered.map((d) => d.pay_date)).toEqual(["2026-06-01", "2026-08-01"]);
  });
});

describe("computeChartWindowMetrics", () => {
  it("computes price change from first to last close in the window", () => {
    const h = [
      { trade_date: "2026-07-01", close_price: 20 },
      { trade_date: "2026-08-01", close_price: 22 },
    ];
    const m = computeChartWindowMetrics(h, []);
    expect(m.priceChangePct).toBeCloseTo(10, 5);
  });

  it("sums real distribution amounts, ignoring null (TBD) rows", () => {
    const d = [
      { pay_date: "2026-07-01", amount: 0.5 },
      { pay_date: "2026-07-15", amount: null },
      { pay_date: "2026-08-01", amount: 0.4 },
    ];
    const m = computeChartWindowMetrics([], d);
    expect(m.totalDistributions).toBeCloseTo(0.9, 5);
    expect(m.distributionCount).toBe(2);
  });

  it("returns nulls honestly when there isn't enough data", () => {
    const m = computeChartWindowMetrics([{ trade_date: "2026-08-01", close_price: 20 }], []);
    expect(m.priceChangePct).toBeNull();
    expect(m.totalDistributions).toBeNull();
  });
});

describe("computeEvenTicks", () => {
  it("produces evenly spaced values including both endpoints", () => {
    expect(computeEvenTicks(0, 100, 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it("falls back to a single value when max <= min", () => {
    expect(computeEvenTicks(10, 10, 5)).toEqual([10]);
    expect(computeEvenTicks(10, 5, 5)).toEqual([10]);
  });

  it("falls back to a single value when count <= 1", () => {
    expect(computeEvenTicks(0, 100, 1)).toEqual([0]);
  });
});
