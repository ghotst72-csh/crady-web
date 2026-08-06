import { describe, it, expect } from "vitest";
import { computeScoreBreakdown, buildScoreNarrative, type RiskInput } from "./scoreExplain";

// Real live row (etf_risk_metrics, ticker=TSLY, 2026-08-04 calculation),
// hand-verified during planning: expected total ≈ 33.63.
const TSLY: RiskInput = {
  cradyScore: 33.63,
  riskLevel: "NORMAL",
  dividendStabilityScore: 88.93,
  recoveryScore: 0,
  maxDrawdown: -90.584938,
  volatility30d: 65.718288,
  trendScore: 7.950304,
  momentumScore: 0,
};

// Real live row, ticker=MSTY.
const MSTY: RiskInput = {
  cradyScore: 19.29,
  riskLevel: "EXTREME",
  dividendStabilityScore: 98.32,
  recoveryScore: 0,
  maxDrawdown: -94.864143,
  volatility30d: 141.618171,
  trendScore: 0,
  momentumScore: 0,
};

describe("computeScoreBreakdown", () => {
  it("reproduces the real pipeline formula for TSLY within rounding", () => {
    const breakdown = computeScoreBreakdown(TSLY)!;
    expect(breakdown.total).toBeCloseTo(33.63, 0);
    expect(breakdown.riskPenalty.points).toBe(4); // NORMAL
    expect(breakdown.components).toHaveLength(6);
    expect(breakdown.components.every((c) => !c.usedDefault)).toBe(true);
  });

  it("reproduces the real pipeline formula for MSTY (EXTREME risk, high volatility)", () => {
    const breakdown = computeScoreBreakdown(MSTY)!;
    expect(breakdown.total).toBeCloseTo(19.29, 0);
    expect(breakdown.riskPenalty.points).toBe(16); // EXTREME
  });

  it("returns null when crady_score itself is unavailable", () => {
    expect(computeScoreBreakdown({ ...TSLY, cradyScore: null })).toBeNull();
  });

  it("falls back to documented pipeline defaults for missing sub-scores, flagged as such", () => {
    const breakdown = computeScoreBreakdown({
      cradyScore: 40,
      riskLevel: null,
      dividendStabilityScore: null,
      recoveryScore: null,
      maxDrawdown: null,
      volatility30d: null,
      trendScore: null,
      momentumScore: null,
    })!;
    expect(breakdown.components.every((c) => c.usedDefault)).toBe(true);
    expect(breakdown.riskPenalty.points).toBe(12); // unknown risk_level → "other"
  });

  it("clamps the total to [0, 100]", () => {
    const breakdown = computeScoreBreakdown({
      cradyScore: 5,
      riskLevel: "EXTREME",
      dividendStabilityScore: 0,
      recoveryScore: 0,
      maxDrawdown: -100,
      volatility30d: 100,
      trendScore: 0,
      momentumScore: 0,
    })!;
    expect(breakdown.total).toBeGreaterThanOrEqual(0);
  });
});

describe("buildScoreNarrative", () => {
  it("names the strongest and weakest real contributing factors", () => {
    const breakdown = computeScoreBreakdown(TSLY)!;
    const narrative = buildScoreNarrative(breakdown, "en");
    expect(narrative.length).toBeGreaterThanOrEqual(2);
    expect(narrative[0]).toMatch(/Dividend Stability/);
    expect(narrative.some((s) => s.includes("NORMAL"))).toBe(true);
  });

  it("renders Korean narrative for a Korean-labeled ticker", () => {
    const breakdown = computeScoreBreakdown(MSTY)!;
    const narrative = buildScoreNarrative(breakdown, "ko");
    expect(narrative.some((s) => s.includes("EXTREME"))).toBe(true);
  });
});
