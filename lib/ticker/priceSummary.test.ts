import { describe, it, expect } from "vitest";
import { buildPriceSummary, buildDividendPriceComparison } from "./priceSummary";

function daysOfHistory(n: number, startPrice: number, drift = 0): { trade_date: string; close_price: number | null }[] {
  const out = [];
  const base = new Date("2026-01-01T00:00:00Z");
  for (let i = 0; i < n; i++) {
    const d = new Date(base.getTime() + i * 86400000);
    out.push({
      trade_date: d.toISOString().slice(0, 10),
      close_price: startPrice + drift * i,
    });
  }
  return out;
}

describe("buildPriceSummary", () => {
  it("returns nulls/empty windows for empty history", () => {
    const s = buildPriceSummary([]);
    expect(s.currentPrice).toBeNull();
    expect(s.asOfDate).toBeNull();
    expect(s.todayChangePct).toBeNull();
    expect(s.rangeLabel).toBeNull();
    expect(s.windows["1W"].sparkline).toEqual([]);
  });

  it("computes current price, as-of date and today's change from the last two closes", () => {
    const history = [
      { trade_date: "2026-07-30", close_price: 14.5 },
      { trade_date: "2026-07-31", close_price: 14.82 },
    ];
    const s = buildPriceSummary(history);
    expect(s.currentPrice).toBe(14.82);
    expect(s.asOfDate).toBe("2026-07-31");
    expect(s.todayChangePct).toBeCloseTo(2.2069, 3);
  });

  it("filters out null closes before computing anything", () => {
    const history = [
      { trade_date: "2026-07-29", close_price: null },
      { trade_date: "2026-07-30", close_price: 14.5 },
      { trade_date: "2026-07-31", close_price: 14.82 },
    ];
    const s = buildPriceSummary(history);
    expect(s.currentPrice).toBe(14.82);
    expect(s.todayChangePct).toBeCloseTo(2.2069, 3);
  });

  it("labels the range SINCE_INCEPTION for a young ETF (< ~200 trading days)", () => {
    const s = buildPriceSummary(daysOfHistory(30, 10, 0.05));
    expect(s.rangeLabel).toBe("SINCE_INCEPTION");
    expect(s.rangeTradingDays).toBe(30);
  });

  it("labels the range 52W once at least ~200 trading days exist", () => {
    const s = buildPriceSummary(daysOfHistory(252, 10, 0.01));
    expect(s.rangeLabel).toBe("52W");
    expect(s.rangeHigh).toBeCloseTo(10 + 0.01 * 251, 5);
    expect(s.rangeLow).toBe(10);
  });

  it("builds 1W/1M/3M windows as real trading-day slices, oldest first", () => {
    const s = buildPriceSummary(daysOfHistory(90, 10, 0.1));
    expect(s.windows["1W"].sparkline).toHaveLength(5);
    expect(s.windows["1M"].sparkline).toHaveLength(21);
    expect(s.windows["3M"].sparkline).toHaveLength(63);
    // ascending: last value is the most recent (highest, since drift > 0)
    const w1 = s.windows["1W"].sparkline;
    expect(w1[w1.length - 1]).toBeGreaterThan(w1[0]);
    expect(s.windows["1W"].changePct).toBeGreaterThan(0);
  });

  it("shrinks a window (never fabricates points) when history is shorter than the window", () => {
    const s = buildPriceSummary(daysOfHistory(3, 10, 0.1));
    expect(s.windows["1M"].sparkline).toHaveLength(3);
    expect(s.windows["3M"].sparkline).toHaveLength(3);
  });

  it("returns null changePct/empty sparkline for a window with under 2 points", () => {
    const s = buildPriceSummary(daysOfHistory(1, 10));
    expect(s.windows["1W"].changePct).toBeNull();
    expect(s.windows["1W"].sparkline).toEqual([]);
  });
});

describe("buildDividendPriceComparison", () => {
  const TODAY = "2026-08-03";

  it("computes a 30-day price change from the closest close at/before the 30-day cutoff", () => {
    const history = [
      { trade_date: "2026-07-01", close_price: 14.0 },
      { trade_date: "2026-08-03", close_price: 14.7 },
    ];
    const result = buildDividendPriceComparison(history, [], TODAY);
    expect(result.priceChangePct).toBeCloseTo(5.0, 1);
  });

  it("returns null price change when no history point exists at/before the cutoff", () => {
    const history = [{ trade_date: "2026-08-01", close_price: 14.7 }];
    const result = buildDividendPriceComparison(history, [], TODAY);
    expect(result.priceChangePct).toBeNull();
  });

  it("compares last-30-day dividend sum vs. the prior-30-day sum", () => {
    const distributions = [
      { pay_date: "2026-07-31", amount: 0.3 },
      { pay_date: "2026-07-10", amount: 0.32 },
      { pay_date: "2026-06-20", amount: 0.35 },
      { pay_date: "2026-06-01", amount: 0.34 },
    ];
    const result = buildDividendPriceComparison([], distributions, TODAY);
    // last30 (2026-07-04..2026-08-03]: 0.3 + 0.32 = 0.62
    // prior30 (2026-06-04..2026-07-04]: 0.35 = 0.35 (2026-06-01 falls outside)
    expect(result.dividendChangePct).toBeCloseTo(((0.62 - 0.35) / 0.35) * 100, 3);
  });

  it("returns null dividend change when either 30-day bucket has zero real payments", () => {
    const distributions = [{ pay_date: "2026-07-31", amount: 0.3 }];
    const result = buildDividendPriceComparison([], distributions, TODAY);
    expect(result.dividendChangePct).toBeNull();
  });
});
