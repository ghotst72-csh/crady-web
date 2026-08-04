import { describe, it, expect } from "vitest";
import { buildPortfolioTimeline, type TimelineHoldingInput } from "./timeline";

const TSLY: TimelineHoldingInput = {
  ticker: "TSLY",
  purchaseDate: "2025-08-15",
  investmentAmount: 10000,
  shares: 100,
  history: [
    { trade_date: "2025-08-15", close_price: 100 },
    { trade_date: "2025-08-18", close_price: 90 },
    { trade_date: "2025-08-19", close_price: 80 },
  ],
  eligibleDividends: [{ exDate: "2025-08-18", totalReceived: 500 }],
};

describe("buildPortfolioTimeline", () => {
  it("returns null when no holding has any real price data", () => {
    expect(buildPortfolioTimeline([{ ...TSLY, history: [] }], "2025-08-19")).toBeNull();
  });

  it("samples only real trading days actually present in history, never fabricated/interpolated dates", () => {
    const t = buildPortfolioTimeline([TSLY], "2025-08-19");
    expect(t?.points.map((p) => p.date)).toEqual(["2025-08-15", "2025-08-18", "2025-08-19"]);
  });

  it("computes price-only value as shares * price at each date", () => {
    const t = buildPortfolioTimeline([TSLY], "2025-08-19");
    expect(t?.points[0].priceOnlyValue).toBe(10000); // 100 shares * $100
    expect(t?.points[2].priceOnlyValue).toBe(8000); // 100 shares * $80
  });

  it("dividends-included value adds cumulative eligible dividends only from their ex-date onward", () => {
    const t = buildPortfolioTimeline([TSLY], "2025-08-19");
    expect(t?.points[0].dividendsIncludedValue).toBe(10000); // before the ex-date, no dividend yet
    expect(t?.points[1].dividendsIncludedValue).toBe(9000 + 500); // price 90*100=9000 + $500 dividend on the ex-date itself
    expect(t?.points[2].dividendsIncludedValue).toBe(8000 + 500);
  });

  it("baseline only counts a holding's investment from its purchase date onward, for a portfolio with staggered purchases", () => {
    const laterHolding: TimelineHoldingInput = {
      ticker: "MSTY",
      purchaseDate: "2025-08-18", // joins partway through
      investmentAmount: 5000,
      shares: 50,
      history: [
        { trade_date: "2025-08-18", close_price: 100 },
        { trade_date: "2025-08-19", close_price: 100 },
      ],
      eligibleDividends: [],
    };
    const t = buildPortfolioTimeline([TSLY, laterHolding], "2025-08-19");
    const byDate = new Map(t?.points.map((p) => [p.date, p]));
    expect(byDate.get("2025-08-15")?.baseline).toBe(10000); // only TSLY owned yet
    expect(byDate.get("2025-08-18")?.baseline).toBe(15000); // both owned now
  });

  it("produces a dividend event marker for each real eligible dividend, sorted by date", () => {
    const t = buildPortfolioTimeline([TSLY], "2025-08-19");
    expect(t?.events).toEqual([{ date: "2025-08-18", ticker: "TSLY", amount: 500 }]);
  });

  it("excludes a holding's dates from before its own purchase date", () => {
    const early = { ...TSLY, purchaseDate: "2025-08-19" }; // purchase on the last available date
    const t = buildPortfolioTimeline([early], "2025-08-19");
    expect(t?.points.map((p) => p.date)).toEqual(["2025-08-19"]);
  });
});
