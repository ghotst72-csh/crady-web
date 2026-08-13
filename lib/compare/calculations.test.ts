import { describe, it, expect } from "vitest";
import { computePeriodReturn, pickBestTicker } from "./calculations";
import type { PriceHistoryPoint, DistributionPoint } from "@/lib/portfolio/calculations";

const HISTORY: PriceHistoryPoint[] = [
  { trade_date: "2025-01-02", close_price: 100 },
  { trade_date: "2025-02-01", close_price: 80 }, // dip -> real drawdown inside the window
  { trade_date: "2025-06-02", close_price: 110 },
  { trade_date: "2025-12-31", close_price: 125 },
];

const DISTRIBUTIONS: DistributionPoint[] = [
  { ex_date: "2025-06-02", pay_date: "2025-06-05", amount: 3 },
  { ex_date: "2025-12-01", pay_date: "2025-12-05", amount: 4 },
];

describe("computePeriodReturn", () => {
  it("computes a successful result matching computeHistoricalReturn's own math", () => {
    const r = computePeriodReturn("TEST", HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.ticker).toBe("TEST");
    // shares = 10000/100 = 100; ending = 100*125 = 12500; distributions = 100*(3+4) = 700
    // total return = (12500+700-10000)/10000 = 32%
    expect(r.totalReturnPct).toBeCloseTo(32, 5);
    expect(r.totalDistributionsReceived).toBeCloseTo(700, 5);
    expect(r.priceReturnPct).toBeCloseTo(25, 5);
  });

  it("bounds Max Drawdown to the resolved window only", () => {
    const r = computePeriodReturn("TEST", HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31");
    if (!r.ok) throw new Error("expected ok:true");
    // 100 -> 80 is a -20% drawdown, fully inside the window
    expect(r.maxDrawdownPct).toBeCloseTo(-20, 5);
  });

  it("excludes a drawdown that falls outside the requested window", () => {
    const historyWithOutsideDip: PriceHistoryPoint[] = [
      { trade_date: "2024-06-01", close_price: 100 },
      { trade_date: "2024-07-01", close_price: 10 }, // huge dip, but before the window
      { trade_date: "2025-01-02", close_price: 100 },
      { trade_date: "2025-12-31", close_price: 110 },
    ];
    const r = computePeriodReturn("TEST", historyWithOutsideDip, [], "2025-01-02", "2025-12-31");
    if (!r.ok) throw new Error("expected ok:true");
    // Only 100 -> 110 inside the window — no drawdown at all
    expect(r.maxDrawdownPct).toBe(0);
  });

  it("maps not-listed-yet to insufficient-history (the fairness bucket)", () => {
    const r = computePeriodReturn("TEST", HISTORY, DISTRIBUTIONS, "2020-01-01", "2020-12-31");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("insufficient-history");
  });

  it("a future-dated sale request resolves to the latest real trading day rather than failing", () => {
    // resolvePurchasePrice snaps to the nearest trading day AT OR BEFORE
    // the requested date, so a sale date beyond the available history
    // simply resolves to the last real row, saleDateAdjusted=true — this
    // is not an error case. (computeHistoricalReturn's "insufficient-data"
    // reason is consequently unreachable via normal flow once saleDate >=
    // purchaseDate is already validated: if purchase resolves at all,
    // that same point is also "at or before" any later sale date.)
    const r = computePeriodReturn("TEST", HISTORY, DISTRIBUTIONS, "2025-01-02", "2030-01-01");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.endDateResolved).toBe("2025-12-31");
    expect(r.endDateAdjusted).toBe(true);
  });

  it("passes split-anomaly through unchanged, not lumped into insufficient-history", () => {
    const splitHistory: PriceHistoryPoint[] = [
      { trade_date: "2025-01-02", close_price: 100 },
      { trade_date: "2025-06-01", close_price: 20 }, // 5x overnight — split-shaped
      { trade_date: "2025-12-31", close_price: 22 },
    ];
    const r = computePeriodReturn("TEST", splitHistory, [], "2025-01-02", "2025-12-31");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("split-anomaly");
    expect(r.splitWarnings).toBeDefined();
  });

  it("passes invalid-range through unchanged", () => {
    const r = computePeriodReturn("TEST", HISTORY, DISTRIBUTIONS, "2025-12-31", "2025-01-02");
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("invalid-range");
  });
});

describe("pickBestTicker", () => {
  it("picks the highest value", () => {
    expect(pickBestTicker([{ ticker: "A", value: 10 }, { ticker: "B", value: 25 }, { ticker: "C", value: 5 }])).toBe("B");
  });

  it("skips null values", () => {
    expect(pickBestTicker([{ ticker: "A", value: null }, { ticker: "B", value: 5 }])).toBe("B");
  });

  it("returns null when every value is null", () => {
    expect(pickBestTicker([{ ticker: "A", value: null }, { ticker: "B", value: null }])).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(pickBestTicker([])).toBeNull();
  });

  it("picks the least-negative value for drawdown-style (<=0) numbers", () => {
    // -5% drawdown is better (lower risk) than -35% — the numerically
    // highest value already encodes "best" for this sign convention.
    expect(pickBestTicker([{ ticker: "A", value: -35 }, { ticker: "B", value: -5 }, { ticker: "C", value: -20 }])).toBe("B");
  });
});
