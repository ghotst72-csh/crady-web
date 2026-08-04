import { describe, it, expect } from "vitest";
import { computeHealthScore, HEALTH_SCORE_WEIGHTS, type HealthScoreInput } from "./healthScore";

const FULL_DATA_GOOD: HealthScoreInput = {
  totalReturnPct: 50,
  maxDrawdownPct: 0,
  avgCurrentYieldPct: 40,
  avgDividendStabilityScore: 100,
  diversificationScore: 100,
  topProviderPct: 0,
  topUnderlyingPct: 0,
  dataCompletenessFraction: 1,
};

const FULL_DATA_BAD: HealthScoreInput = {
  totalReturnPct: -50,
  maxDrawdownPct: -60,
  avgCurrentYieldPct: 0,
  avgDividendStabilityScore: 0,
  diversificationScore: 0,
  topProviderPct: 100,
  topUnderlyingPct: 100,
  dataCompletenessFraction: 0,
};

const ALL_NULL: HealthScoreInput = {
  totalReturnPct: null,
  maxDrawdownPct: null,
  avgCurrentYieldPct: null,
  avgDividendStabilityScore: null,
  diversificationScore: null,
  topProviderPct: null,
  topUnderlyingPct: null,
  dataCompletenessFraction: null,
};

describe("computeHealthScore", () => {
  it("a maximally favorable portfolio scores at (or very near) 100", () => {
    const r = computeHealthScore(FULL_DATA_GOOD);
    expect(r.overall).toBeGreaterThan(97);
  });

  it("a maximally unfavorable portfolio scores at (or very near) 0", () => {
    const r = computeHealthScore(FULL_DATA_BAD);
    expect(r.overall).toBeLessThan(3);
  });

  it("total return alone never determines the whole score", () => {
    const highReturnOnly: HealthScoreInput = { ...FULL_DATA_BAD, totalReturnPct: 100 };
    const r = computeHealthScore(highReturnOnly);
    // even with a great return, everything else is terrible -> score should stay low
    expect(r.overall).toBeLessThan(30);
  });

  it("weights sum to 100 (explicit, documented allocation)", () => {
    const total = Object.values(HEALTH_SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("returns 0 overall (not NaN or a fabricated value) when every input is missing", () => {
    const r = computeHealthScore(ALL_NULL);
    expect(r.overall).toBe(0);
    expect(r.availableWeight).toBe(0);
    expect(r.components.every((c) => c.score === null)).toBe(true);
  });

  it("rescales fairly when only some components have real data — a portfolio isn't punished for one missing input", () => {
    const onlyReturn: HealthScoreInput = { ...ALL_NULL, totalReturnPct: 50 }; // best possible return
    const r = computeHealthScore(onlyReturn);
    // With only totalReturn available and it's maxed out, overall should be ~100, not diluted toward 0 by the missing components.
    expect(r.overall).toBeGreaterThan(95);
    expect(r.availableWeight).toBe(HEALTH_SCORE_WEIGHTS.totalReturn);
  });

  it("never lets an extreme yield claim more than its capped share of points (no unbounded reward for an outlier yield)", () => {
    const extremeYield: HealthScoreInput = { ...ALL_NULL, avgCurrentYieldPct: 500 };
    const r = computeHealthScore(extremeYield);
    const incomeComponent = r.components.find((c) => c.key === "incomeStrength");
    expect(incomeComponent?.score).toBe(HEALTH_SCORE_WEIGHTS.incomeStrength); // capped, not proportional to 500%
  });
});
