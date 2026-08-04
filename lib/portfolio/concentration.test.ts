import { describe, it, expect } from "vitest";
import { computeConcentration, computeDiversificationScore, type ConcentrationHolding } from "./concentration";

function holding(overrides: Partial<ConcentrationHolding> & { ticker: string; investmentAmount: number }): ConcentrationHolding {
  return {
    providerLabel: "YieldMax",
    underlyingLabel: overrides.ticker,
    strategyLabel: "Single-Stock Covered Call",
    payoutFrequency: "weekly",
    ...overrides,
  };
}

describe("computeConcentration", () => {
  it("returns null for an empty portfolio", () => {
    expect(computeConcentration([])).toBeNull();
  });

  it("computes provider concentration percentages that sum to ~100", () => {
    const c = computeConcentration([
      holding({ ticker: "TSLY", investmentAmount: 7000, providerLabel: "YieldMax" }),
      holding({ ticker: "QDTE", investmentAmount: 3000, providerLabel: "Roundhill" }),
    ]);
    expect(c?.byProvider.find((p) => p.label === "YieldMax")?.pct).toBeCloseTo(70, 5);
    expect(c?.byProvider.find((p) => p.label === "Roundhill")?.pct).toBeCloseTo(30, 5);
  });

  it("merges different tickers sharing the same real underlying asset (§17's explicit rule)", () => {
    const c = computeConcentration([
      holding({ ticker: "TSLY", investmentAmount: 5000, underlyingLabel: "TSLA" }),
      holding({ ticker: "TSLQ", investmentAmount: 5000, underlyingLabel: "TSLA" }), // different ticker, same underlying
    ]);
    const tsla = c?.byUnderlying.find((u) => u.label === "TSLA");
    expect(tsla?.pct).toBeCloseTo(100, 5);
    expect(c?.byUnderlying).toHaveLength(1);
  });

  it("identifies the correct top holding by dollar weight", () => {
    const c = computeConcentration([
      holding({ ticker: "SMALL", investmentAmount: 1000 }),
      holding({ ticker: "BIG", investmentAmount: 9000 }),
    ]);
    expect(c?.topHolding).toEqual({ ticker: "BIG", pct: 90 });
  });

  it("sorts each grouping descending by amount", () => {
    const c = computeConcentration([
      holding({ ticker: "A", investmentAmount: 1000, providerLabel: "Defiance" }),
      holding({ ticker: "B", investmentAmount: 5000, providerLabel: "YieldMax" }),
    ]);
    expect(c?.byProvider[0].label).toBe("YieldMax");
  });
});

describe("computeDiversificationScore", () => {
  it("returns 0 for a single holding (no diversification)", () => {
    expect(computeDiversificationScore([{ label: "TSLA", amount: 100, pct: 100 }])).toBe(0);
  });

  it("returns 100 for a perfectly even split across several holdings", () => {
    const score = computeDiversificationScore([
      { label: "A", amount: 25, pct: 25 },
      { label: "B", amount: 25, pct: 25 },
      { label: "C", amount: 25, pct: 25 },
      { label: "D", amount: 25, pct: 25 },
    ]);
    expect(score).toBeCloseTo(100, 5);
  });

  it("scores an uneven split lower than an even split with the same holding count", () => {
    const even = computeDiversificationScore([
      { label: "A", amount: 50, pct: 50 },
      { label: "B", amount: 50, pct: 50 },
    ]);
    const uneven = computeDiversificationScore([
      { label: "A", amount: 90, pct: 90 },
      { label: "B", amount: 10, pct: 10 },
    ]);
    expect(uneven).toBeLessThan(even);
  });

  it("returns 0 for an empty grouping", () => {
    expect(computeDiversificationScore([])).toBe(0);
  });
});
