import { describe, it, expect } from "vitest";
import { computeHistoricalReturn } from "./historicalReturnCalc";
import type { PriceHistoryPoint, DistributionPoint } from "@/lib/portfolio/calculations";

// A synthetic but realistic price series: two trading days back-to-back
// around a weekend gap (Jan 3 Fri -> Jan 6 Mon), then sparse points through
// the year, then a New Year's holiday gap (Dec 31 -> Jan 2). Deliberately
// includes exact-match trading days for every distribution's ex-date so
// simulateReinvestment's per-distribution reinvestment price is
// hand-verifiable.
const HISTORY: PriceHistoryPoint[] = [
  { trade_date: "2025-01-02", close_price: 100 }, // Thu
  { trade_date: "2025-01-03", close_price: 101 }, // Fri
  { trade_date: "2025-01-06", close_price: 102 }, // Mon (weekend gap)
  { trade_date: "2025-06-02", close_price: 110 },
  { trade_date: "2025-06-03", close_price: 111 },
  { trade_date: "2025-12-01", close_price: 120 },
  { trade_date: "2025-12-31", close_price: 125 }, // Wed
  { trade_date: "2026-01-02", close_price: 130 }, // next trading day after New Year's
];

const DISTRIBUTIONS: DistributionPoint[] = [
  { ex_date: "2025-01-01", pay_date: "2025-01-05", amount: 5 }, // before any purchase date used below
  { ex_date: "2025-06-02", pay_date: "2025-06-10", amount: 3 },
  { ex_date: "2025-12-01", pay_date: "2025-12-10", amount: 4 },
  { ex_date: "2026-06-01", pay_date: "2026-06-10", amount: 10 }, // after every sale date used below
  { ex_date: "2025-07-01", pay_date: "2025-07-10", amount: null }, // unpaid/pending — must be excluded
];

describe("computeHistoricalReturn — hand-computed exact scenario", () => {
  it("computes principal, distributions, cash total, and DRIP total exactly for an exact-trading-day purchase and sale", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31", 10000);
    if (!r.ok) throw new Error("expected ok:true");

    expect(r.purchaseDate).toBe("2025-01-02");
    expect(r.purchaseDateAdjusted).toBe(false);
    expect(r.purchasePrice).toBe(100);
    expect(r.saleDate).toBe("2025-12-31");
    expect(r.saleDateAdjusted).toBe(false);
    expect(r.salePrice).toBe(125);

    // shares = 10000 / 100
    expect(r.shares).toBeCloseTo(100, 6);
    // endingShareValue = 100 * 125
    expect(r.endingShareValue).toBeCloseTo(12500, 6);
    expect(r.priceGainLoss).toBeCloseTo(2500, 6);
    expect(r.priceReturnPct).toBeCloseTo(25, 6);

    // Only the 2025-06-02 ($3) and 2025-12-01 ($4) distributions are
    // in-window; 2025-01-01 is before purchase, 2026-06-01 is after sale,
    // and the null-amount row is unpaid — all three excluded.
    expect(r.distributions).toHaveLength(2);
    expect(r.distributionPerShareTotal).toBeCloseTo(7, 6);
    expect(r.totalDistributionsReceived).toBeCloseTo(700, 6); // 100 shares * $7

    expect(r.finalValueCash).toBeCloseTo(13200, 6); // 12500 + 700
    expect(r.profitLossCash).toBeCloseTo(3200, 6);
    expect(r.totalReturnPctCash).toBeCloseTo(32, 6);
    expect(r.annualizedReturnPctCash).not.toBeNull();

    // DRIP: 100 shares -> +$300 reinvested @ $110 on 6/2 -> +$410.909... @
    // $120 on 12/1 -> 106.151515... final shares * $125 sale price.
    expect(r.dripFinalShares).toBeCloseTo(106.151515, 5);
    expect(r.dripFinalValue).toBeCloseTo(13268.939394, 4);
    expect(r.dripProfitLoss).toBeCloseTo(3268.939394, 4);
    expect(r.dripTotalReturnPct).toBeCloseTo(32.689394, 4);

    // Reinvesting must produce strictly more combined value than taking
    // distributions as cash, given a positive per-distribution price.
    expect(r.dripFinalValue).toBeGreaterThan(r.finalValueCash);
  });
});

describe("computeHistoricalReturn — non-trading-day date handling", () => {
  it("snaps a weekend purchase date to the prior trading day and flags it as adjusted", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-04", "2025-12-31", 10000); // Sat
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.requestedPurchaseDate).toBe("2025-01-04");
    expect(r.purchaseDate).toBe("2025-01-03"); // nearest trading day at/before
    expect(r.purchaseDateAdjusted).toBe(true);
    expect(r.purchasePrice).toBe(101);
  });

  it("snaps a holiday sale date to the prior trading day and flags it as adjusted", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2026-01-01", 10000); // New Year's Day
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.requestedSaleDate).toBe("2026-01-01");
    expect(r.saleDate).toBe("2025-12-31"); // 2026-01-02 is AFTER the requested date, never used
    expect(r.saleDateAdjusted).toBe(true);
    expect(r.salePrice).toBe(125);
  });

  it("never selects a trading day after the requested date, even when one exists in history", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-30", 10000);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.saleDate).toBe("2025-12-01"); // the only point at/before 12/30 — not 12/31
  });
});

describe("computeHistoricalReturn — split anomaly", () => {
  it("refuses to compute a number when a split-shaped price discontinuity falls inside the holding window", () => {
    const splitHistory: PriceHistoryPoint[] = [
      { trade_date: "2025-01-02", close_price: 100 },
      { trade_date: "2025-06-01", close_price: 20 }, // 5:1 reverse-split-shaped drop, ratio 0.2 < 0.4 floor
      { trade_date: "2025-12-31", close_price: 22 },
    ];
    const r = computeHistoricalReturn(splitHistory, DISTRIBUTIONS, "2025-01-02", "2025-12-31", 10000);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("split-anomaly");
    expect(r.splitWarnings).toHaveLength(1);
    expect(r.splitWarnings![0].date).toBe("2025-06-01");
  });

  it("computes normally when a large price move falls OUTSIDE the requested holding window", () => {
    const splitHistory: PriceHistoryPoint[] = [
      { trade_date: "2024-01-02", close_price: 500 },
      { trade_date: "2024-06-01", close_price: 20 }, // anomaly, but before the window below
      { trade_date: "2025-01-02", close_price: 22 },
      { trade_date: "2025-12-31", close_price: 25 },
    ];
    const r = computeHistoricalReturn(splitHistory, DISTRIBUTIONS, "2025-01-02", "2025-12-31", 10000);
    expect(r.ok).toBe(true);
  });
});

describe("computeHistoricalReturn — required edge cases", () => {
  it("rejects a purchase date before the ETF's first recorded trading day", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2020-01-01", "2025-12-31", 10000);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("not-listed-yet");
  });

  it("rejects a sale date before the purchase date", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-12-31", "2025-01-02", 10000);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected ok:false");
    expect(r.reason).toBe("invalid-range");
  });

  it("rejects a zero or negative investment amount", () => {
    expect(computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31", 0).ok).toBe(false);
    expect(computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31", -500).ok).toBe(false);
  });

  it("a very short holding period (1 day, no distributions) still computes a price-only result", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-01-03", 10000);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.shares).toBeCloseTo(100, 6);
    expect(r.salePrice).toBe(101);
    expect(r.distributions).toHaveLength(0);
    expect(r.totalDistributionsReceived).toBe(0);
    expect(Number.isFinite(r.priceReturnPct ?? 0)).toBe(true);
  });

  it("a long holding period (full available history) computes without NaN/Infinity", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2026-01-02", 10000);
    if (!r.ok) throw new Error("expected ok:true");
    expect(Number.isFinite(r.finalValueCash)).toBe(true);
    expect(Number.isFinite(r.dripFinalValue)).toBe(true);
    expect(Number.isFinite(r.annualizedReturnPctCash ?? 0)).toBe(true);
  });

  it("DRIP OFF (cash) and DRIP ON (reinvested) are both always computed, independent of any UI toggle state", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-02", "2025-12-31", 10000);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.finalValueCash).not.toBeCloseTo(r.dripFinalValue, 2);
  });

  it("handles an ETF with zero eligible distributions in the window cleanly (price-only return)", () => {
    const r = computeHistoricalReturn(HISTORY, DISTRIBUTIONS, "2025-01-03", "2025-01-06", 10000);
    if (!r.ok) throw new Error("expected ok:true");
    expect(r.distributions).toHaveLength(0);
    expect(r.finalValueCash).toBeCloseTo(r.endingShareValue, 6);
    expect(r.dripFinalValue).toBeCloseTo(r.endingShareValue, 6);
  });
});
