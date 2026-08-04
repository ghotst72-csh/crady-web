import { describe, it, expect } from "vitest";
import {
  resolvePurchasePrice,
  latestPriceAtOrBefore,
  resolveSharesAndAmount,
  computeEligibleDividends,
  computePriceReturn,
  computeTotalReturn,
  computeAnnualizedReturnPct,
  daysBetween,
  computeMaxDrawdownPct,
  computePriceStatus,
  detectSplitWarnings,
  computeAlternativeReturn,
  simulateReinvestment,
} from "./calculations";

const HISTORY = [
  { trade_date: "2025-08-14", close_price: 14.5 }, // Thursday
  { trade_date: "2025-08-15", close_price: 14.2 }, // Friday
  { trade_date: "2025-08-18", close_price: 14.35 }, // Monday (Sat/Sun gap)
  { trade_date: "2025-08-19", close_price: 14.1 },
];

describe("resolvePurchasePrice", () => {
  it("uses the user's own price as-is, at the requested date, never estimated", () => {
    const r = resolvePurchasePrice(HISTORY, "2025-08-15", 14.2);
    expect(r).toEqual({
      effectiveDate: "2025-08-15",
      effectivePrice: 14.2,
      isEstimatedPrice: false,
      dateAdjusted: false,
    });
  });

  it("auto-estimates from the exact trading day when requested date has a real close", () => {
    const r = resolvePurchasePrice(HISTORY, "2025-08-15", null);
    expect(r).toEqual({
      effectiveDate: "2025-08-15",
      effectivePrice: 14.2,
      isEstimatedPrice: true,
      dateAdjusted: false,
    });
  });

  it("snaps back to the nearest prior trading day for a weekend purchase date", () => {
    // 2025-08-16 is a Saturday — nearest prior trading day is Friday 08-15
    const r = resolvePurchasePrice(HISTORY, "2025-08-16", null);
    expect(r).toEqual({
      effectiveDate: "2025-08-15",
      effectivePrice: 14.2,
      isEstimatedPrice: true,
      dateAdjusted: true,
    });
  });

  it("snaps back across a full weekend gap (Sunday -> Friday)", () => {
    const r = resolvePurchasePrice(HISTORY, "2025-08-17", null);
    expect(r?.effectiveDate).toBe("2025-08-15");
    expect(r?.dateAdjusted).toBe(true);
  });

  it("returns null when the ETF wasn't listed yet at the requested date", () => {
    const r = resolvePurchasePrice(HISTORY, "2025-08-01", null);
    expect(r).toBeNull();
  });

  it("never picks a future trading day even if closer than the past one", () => {
    // requested date exactly between two trading days would still only look backward
    const sparse = [
      { trade_date: "2025-01-01", close_price: 10 },
      { trade_date: "2025-06-01", close_price: 20 },
    ];
    const r = resolvePurchasePrice(sparse, "2025-03-15", null);
    expect(r?.effectiveDate).toBe("2025-01-01");
  });
});

describe("latestPriceAtOrBefore", () => {
  it("finds the most recent close at/before the given date", () => {
    const r = latestPriceAtOrBefore(HISTORY, "2025-08-19");
    expect(r).toEqual({ trade_date: "2025-08-19", close_price: 14.1 });
  });

  it("skips ahead to the prior trading day if the exact date has no data", () => {
    const r = latestPriceAtOrBefore(HISTORY, "2025-08-20");
    expect(r?.trade_date).toBe("2025-08-19");
  });
});

describe("resolveSharesAndAmount", () => {
  it("derives investmentAmount from shares", () => {
    expect(resolveSharesAndAmount(500, null, 14.2)).toEqual({ shares: 500, investmentAmount: 7100 });
  });

  it("derives shares from investmentAmount", () => {
    const r = resolveSharesAndAmount(null, 7100, 14.2);
    expect(r.investmentAmount).toBe(7100);
    expect(r.shares).toBeCloseTo(500, 5);
  });

  it("throws if neither is provided", () => {
    expect(() => resolveSharesAndAmount(null, null, 14.2)).toThrow();
  });
});

describe("computeEligibleDividends", () => {
  const distributions = [
    { ex_date: "2025-08-10", pay_date: "2025-08-14", amount: 0.3 }, // before purchase — excluded
    { ex_date: "2025-08-15", pay_date: "2025-08-19", amount: 0.28 }, // on purchase date — included
    { ex_date: "2025-08-22", pay_date: "2025-08-26", amount: 0.31 }, // after purchase — included
    { ex_date: "2025-08-29", pay_date: "2025-09-02", amount: null }, // prediction/no amount — excluded
  ];

  it("excludes dividends whose ex-date is before the purchase date", () => {
    const result = computeEligibleDividends(distributions, "2025-08-15", 500);
    expect(result.map((d) => d.exDate)).toEqual(["2025-08-15", "2025-08-22"]);
  });

  it("includes a dividend whose ex-date exactly equals the purchase date", () => {
    const result = computeEligibleDividends(distributions, "2025-08-15", 500);
    expect(result[0].exDate).toBe("2025-08-15");
  });

  it("excludes rows with a null amount (predictions), even if ex-date qualifies", () => {
    const result = computeEligibleDividends(distributions, "2025-08-01", 500);
    expect(result.some((d) => d.exDate === "2025-08-29")).toBe(false);
  });

  it("computes totalReceived as amountPerShare * shares", () => {
    const result = computeEligibleDividends(distributions, "2025-08-15", 500);
    expect(result[0].totalReceived).toBeCloseTo(140, 5); // 0.28 * 500
  });

  it("a purchase one day after an ex-date excludes that payment", () => {
    const result = computeEligibleDividends(distributions, "2025-08-16", 500);
    expect(result.map((d) => d.exDate)).toEqual(["2025-08-22"]);
  });
});

describe("computePriceReturn", () => {
  it("computes gain amount and pct", () => {
    const r = computePriceReturn(10000, 12000);
    expect(r.amount).toBe(2000);
    expect(r.pct).toBe(20);
  });
  it("computes loss amount and pct", () => {
    const r = computePriceReturn(20000, 11600);
    expect(r.amount).toBe(-8400);
    expect(r.pct).toBeCloseTo(-42, 1);
  });
});

describe("computeTotalReturn", () => {
  it("matches the spec's worked example: price loss partly offset by dividends, still a net loss", () => {
    // $20,000 invested, now worth $11,600, $6,100 in dividends received
    const r = computeTotalReturn(20000, 11600, 6100);
    expect(r.amount).toBe(-2300);
    expect(r.pct).toBeCloseTo(-11.5, 1);
  });

  it("dividends can flip a price loss into a net gain", () => {
    const r = computeTotalReturn(10000, 9000, 1500);
    expect(r.amount).toBe(500);
    expect(r.pct).toBe(5);
  });
});

describe("computeAnnualizedReturnPct", () => {
  it("returns the same pct for exactly a 1-year hold", () => {
    const r = computeAnnualizedReturnPct(20, 365.25);
    expect(r).toBeCloseTo(20, 5);
  });

  it("annualizes a 2-year total return down via CAGR", () => {
    // (1.2)^(1/2) - 1 ≈ 9.54%
    const r = computeAnnualizedReturnPct(20, 730.5);
    expect(r).toBeCloseTo(9.5445, 3);
  });

  it("annualizes a short-period return up (compounding)", () => {
    // 6-month hold at +5% total return -> annualized should exceed 5%
    const r = computeAnnualizedReturnPct(5, 182.6);
    expect(r).toBeGreaterThan(5);
  });

  it("returns null for a same-day (0-day) hold", () => {
    expect(computeAnnualizedReturnPct(5, 0)).toBeNull();
  });
});

describe("daysBetween", () => {
  it("computes whole-day differences", () => {
    expect(daysBetween("2025-08-15", "2026-08-15")).toBe(365);
    expect(daysBetween("2025-08-15", "2025-08-15")).toBe(0);
  });
});

describe("computeMaxDrawdownPct", () => {
  it("matches the spec's worked example shape: a large peak-to-trough decline", () => {
    // roughly mimics a ~48% max drawdown
    const closes = [48.25, 40, 30, 25, 21.59];
    const dd = computeMaxDrawdownPct(closes);
    expect(dd).toBeCloseTo(((21.59 - 48.25) / 48.25) * 100, 3);
  });

  it("returns 0 for a monotonically increasing series (no drawdown)", () => {
    expect(computeMaxDrawdownPct([10, 11, 12, 13])).toBe(0);
  });

  it("finds the worst drawdown, not just the first-to-last change", () => {
    // dips hard in the middle then recovers most of the way
    const closes = [10, 5, 9];
    const dd = computeMaxDrawdownPct(closes);
    expect(dd).toBeCloseTo(-50, 5);
  });

  it("returns null for fewer than 2 points", () => {
    expect(computeMaxDrawdownPct([10])).toBeNull();
    expect(computeMaxDrawdownPct([])).toBeNull();
  });
});

describe("computePriceStatus", () => {
  it("is current when the latest price is from today or within a few days", () => {
    expect(computePriceStatus("2026-08-03", "2026-08-04").status).toBe("current");
  });
  it("is delayed when stale beyond the threshold — matches the real JEPY case", () => {
    const r = computePriceStatus("2026-07-17", "2026-08-04");
    expect(r.status).toBe("delayed");
    expect(r.staleDays).toBe(18);
  });
  it("is unavailable when there's no price at all", () => {
    expect(computePriceStatus(null, "2026-08-04").status).toBe("unavailable");
  });
});

describe("computeAlternativeReturn", () => {
  const altHistory = [
    { trade_date: "2025-08-15", close_price: 10 },
    { trade_date: "2025-08-18", close_price: 12 },
    { trade_date: "2025-08-19", close_price: 8 }, // dip -> drawdown
    { trade_date: "2025-08-20", close_price: 11 },
  ];
  const altDistributions = [
    { ex_date: "2025-08-18", pay_date: "2025-08-22", amount: 0.1 },
    { ex_date: "2025-08-10", pay_date: "2025-08-14", amount: 0.5 }, // before purchase, excluded
  ];

  it("compares by equal dollar amount, not equal share count", () => {
    // $10,000 at $10/share purchase price -> 1000 equivalent shares
    const r = computeAlternativeReturn(altHistory, altDistributions, "2025-08-15", 10000, "2025-08-20");
    expect(r?.currentValue).toBeCloseTo(1000 * 11, 5); // 1000 shares * $11 current
    expect(r?.dividendsReceived).toBeCloseTo(1000 * 0.1, 5);
  });

  it("computes a max drawdown within the exact purchase-to-now window", () => {
    const r = computeAlternativeReturn(altHistory, altDistributions, "2025-08-15", 10000, "2025-08-20");
    // peak $12 on 08-18, trough $8 on 08-19 -> -33.33%
    expect(r?.maxDrawdownPct).toBeCloseTo(((8 - 12) / 12) * 100, 3);
  });

  it("returns null when the alternative wasn't listed yet at the purchase date", () => {
    const r = computeAlternativeReturn(altHistory, altDistributions, "2020-01-01", 10000, "2025-08-20");
    expect(r).toBeNull();
  });

  it("returns null when there's no current price for the alternative", () => {
    const r = computeAlternativeReturn(altHistory, altDistributions, "2025-08-15", 10000, "2020-01-01");
    expect(r).toBeNull();
  });
});

describe("simulateReinvestment", () => {
  const history = [
    { trade_date: "2025-08-15", close_price: 10 },
    { trade_date: "2025-08-18", close_price: 10 }, // ex-date 1 price
    { trade_date: "2025-08-25", close_price: 20 }, // ex-date 2 price
    { trade_date: "2025-09-01", close_price: 20 },
  ];
  const distributions = [
    { ex_date: "2025-08-18", pay_date: "2025-08-22", amount: 1 }, // $1/share
    { ex_date: "2025-08-25", pay_date: "2025-08-29", amount: 1 },
  ];

  it("compounds shares across two dividend events", () => {
    // start: 100 shares. Div 1: $1*100=$100 cash, buy at $10 -> +10 shares -> 110 shares.
    // Div 2: $1*110=$110 cash, buy at $20 -> +5.5 shares -> 115.5 shares.
    const r = simulateReinvestment(history, distributions, "2025-08-15", 100);
    expect(r.finalShares).toBeCloseTo(115.5, 5);
    expect(r.totalDividendsReinvested).toBeCloseTo(210, 5); // 100 + 110
  });

  it("with zero eligible dividends, returns the initial share count unchanged", () => {
    const r = simulateReinvestment(history, [], "2025-08-15", 100);
    expect(r.finalShares).toBe(100);
    expect(r.totalDividendsReinvested).toBe(0);
  });

  it("produces a strictly larger share count than the non-reinvested baseline whenever dividends exist", () => {
    const r = simulateReinvestment(history, distributions, "2025-08-15", 100);
    expect(r.finalShares).toBeGreaterThan(100);
  });

  it("excludes dividends before the purchase date, same eligibility rule as computeEligibleDividends", () => {
    const r = simulateReinvestment(history, distributions, "2025-08-20", 100);
    // only the 08-25 dividend qualifies
    expect(r.totalDividendsReinvested).toBeCloseTo(100, 5);
  });
});

describe("detectSplitWarnings", () => {
  it("flags an extreme single-day ratio consistent with a reverse split", () => {
    const history = [
      { trade_date: "2025-01-01", close_price: 5 },
      { trade_date: "2025-01-02", close_price: 20 }, // 4x overnight — reverse-split-shaped
      { trade_date: "2025-01-03", close_price: 19.5 },
    ];
    const warnings = detectSplitWarnings(history, "2025-01-01", "2025-01-03");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].date).toBe("2025-01-02");
    expect(warnings[0].ratio).toBe(4);
  });

  it("does not flag normal, even large-ish daily volatility", () => {
    const history = [
      { trade_date: "2025-01-01", close_price: 10 },
      { trade_date: "2025-01-02", close_price: 8 }, // -20%, plausible for this product category
      { trade_date: "2025-01-03", close_price: 9 },
    ];
    expect(detectSplitWarnings(history, "2025-01-01", "2025-01-03")).toHaveLength(0);
  });

  it("only scans within the given date window", () => {
    const history = [
      { trade_date: "2024-01-01", close_price: 5 },
      { trade_date: "2024-01-02", close_price: 20 }, // outside window — ignored
      { trade_date: "2025-01-01", close_price: 10 },
      { trade_date: "2025-01-02", close_price: 10.5 },
    ];
    expect(detectSplitWarnings(history, "2025-01-01", "2025-01-02")).toHaveLength(0);
  });
});
