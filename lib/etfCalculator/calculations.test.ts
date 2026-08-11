import { describe, it, expect } from "vitest";
import { calculateEtfProjection, sanitizeCalculatorInputs } from "./calculations";

describe("calculateEtfProjection — precise hand-computable scenarios", () => {
  it("compounds a lump sum monthly with no contributions, no fee, no distribution split (12%/yr => 1%/mo)", () => {
    const r = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 0,
      years: 1,
      expectedAnnualReturnPct: 12,
      annualFeePct: 0,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    // 1000 * 1.01^12
    expect(r.endingPortfolioValue).toBeCloseTo(1126.825, 2);
    expect(r.totalContributions).toBe(1000);
    expect(r.totalDistributionsReceived).toBe(0);
    expect(r.totalReturnPct).toBeCloseTo(12.6825, 2);
    expect(r.moneyMultiple).toBeCloseTo(1.126825, 4);
  });

  it("with reinvestment OFF and the entire return as distribution yield, the balance never moves and distributions accumulate linearly", () => {
    const r = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 0,
      years: 1,
      expectedAnnualReturnPct: 12,
      annualFeePct: 0,
      distributionYieldPct: 12, // priceReturnPct = 12 - 12 = 0
      reinvestDistributions: false,
    });
    expect(r.endingPortfolioValue).toBeCloseTo(1000, 6);
    expect(r.totalDistributionsReceived).toBeCloseTo(120, 6); // 1000 * 1%/mo * 12
    expect(r.totalEstimatedReturnAmount).toBeCloseTo(120, 6);
    expect(r.totalReturnPct).toBeCloseTo(12, 6);
    expect(r.moneyMultiple).toBeCloseTo(1.12, 6);
  });

  it("the same split reinvested compounds to a strictly higher combined value than paid out as cash", () => {
    const reinvested = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 0,
      years: 1,
      expectedAnnualReturnPct: 12,
      annualFeePct: 0,
      distributionYieldPct: 12,
      reinvestDistributions: true,
    });
    const paidOut = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 0,
      years: 1,
      expectedAnnualReturnPct: 12,
      annualFeePct: 0,
      distributionYieldPct: 12,
      reinvestDistributions: false,
    });
    const reinvestedCombined = reinvested.endingPortfolioValue + reinvested.totalDistributionsReceived;
    const paidOutCombined = paidOut.endingPortfolioValue + paidOut.totalDistributionsReceived;
    expect(reinvestedCombined).toBeGreaterThan(paidOutCombined);
    expect(reinvestedCombined).toBeCloseTo(1126.825, 2);
    expect(paidOutCombined).toBeCloseTo(1120, 6);
  });
});

describe("calculateEtfProjection — required edge cases", () => {
  it("$0 monthly contribution: only the initial lump sum grows", () => {
    const r = calculateEtfProjection({
      initialInvestment: 5000,
      monthlyInvestment: 0,
      years: 10,
      expectedAnnualReturnPct: 7,
      annualFeePct: 0,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(r.totalContributions).toBe(5000);
    expect(r.endingPortfolioValue).toBeGreaterThan(5000);
  });

  it("0% expected return, 0% fee, 0% yield: ending value equals contributions exactly, no growth", () => {
    const r = calculateEtfProjection({
      initialInvestment: 10000,
      monthlyInvestment: 500,
      years: 20,
      expectedAnnualReturnPct: 0,
      annualFeePct: 0,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(r.totalContributions).toBeCloseTo(10000 + 500 * 12 * 20, 6);
    expect(r.endingPortfolioValue).toBeCloseTo(r.totalContributions, 6);
    expect(r.totalReturnPct).toBeCloseTo(0, 6);
    expect(r.moneyMultiple).toBeCloseTo(1, 6);
  });

  it("0% fee alone does not change the outcome vs. omitting the field", () => {
    const withFee = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 100,
      years: 5,
      expectedAnnualReturnPct: 6,
      annualFeePct: 0,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    const withoutFeeField = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 100,
      years: 5,
      expectedAnnualReturnPct: 6,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(withFee.endingPortfolioValue).toBeCloseTo(withoutFeeField.endingPortfolioValue, 6);
  });

  it("a nonzero fee strictly reduces the ending value vs. the same scenario with no fee", () => {
    const noFee = calculateEtfProjection({
      initialInvestment: 10000,
      monthlyInvestment: 500,
      years: 20,
      expectedAnnualReturnPct: 8,
      annualFeePct: 0,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    const withFee = calculateEtfProjection({
      initialInvestment: 10000,
      monthlyInvestment: 500,
      years: 20,
      expectedAnnualReturnPct: 8,
      annualFeePct: 1,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(withFee.endingPortfolioValue).toBeLessThan(noFee.endingPortfolioValue);
  });

  it("short investment period (1 year) completes and produces one non-zero yearly point", () => {
    const r = calculateEtfProjection({
      initialInvestment: 1000,
      monthlyInvestment: 100,
      years: 1,
      expectedAnnualReturnPct: 5,
      annualFeePct: 0.1,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(r.yearly).toHaveLength(2); // year 0 and year 1
    expect(r.yearly[1].year).toBe(1);
    expect(r.endingPortfolioValue).toBeGreaterThan(0);
  });

  it("very long investment period (50 years) completes without NaN/Infinity and stays monotonically increasing for a positive rate", () => {
    const r = calculateEtfProjection({
      initialInvestment: 10000,
      monthlyInvestment: 500,
      years: 50,
      expectedAnnualReturnPct: 8,
      annualFeePct: 0.15,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(Number.isFinite(r.endingPortfolioValue)).toBe(true);
    expect(r.yearly).toHaveLength(51);
    for (let i = 1; i < r.yearly.length; i++) {
      expect(r.yearly[i].portfolioValue).toBeGreaterThan(r.yearly[i - 1].portfolioValue);
    }
  });

  it("a distribution yield larger than the net total return produces a realistic negative price-return-driven scenario (e.g. a covered-call fund), not a crash", () => {
    // Mirrors the real TSLY trailing-12mo example used elsewhere on CRADY:
    // ~37% distribution yield against a ~-7% net total return.
    const r = calculateEtfProjection({
      initialInvestment: 10000,
      monthlyInvestment: 0,
      years: 1,
      expectedAnnualReturnPct: -6.6,
      annualFeePct: 0,
      distributionYieldPct: 36.8,
      reinvestDistributions: false,
    });
    expect(Number.isFinite(r.endingPortfolioValue)).toBe(true);
    expect(r.endingPortfolioValue).toBeLessThan(10000); // price return portion is deeply negative
    expect(r.totalDistributionsReceived).toBeGreaterThan(0);
  });

  it("empty/invalid input (NaN, undefined) never throws and never produces NaN output", () => {
    const r = calculateEtfProjection({
      initialInvestment: NaN,
      monthlyInvestment: undefined,
      years: NaN,
      expectedAnnualReturnPct: NaN,
      annualFeePct: undefined,
      distributionYieldPct: undefined,
      reinvestDistributions: undefined,
    });
    expect(Number.isFinite(r.endingPortfolioValue)).toBe(true);
    expect(r.endingPortfolioValue).toBe(0);
    expect(r.totalReturnPct).toBeNull();
    expect(r.moneyMultiple).toBeNull();
  });

  it("zero contributions altogether (no initial, no monthly): return metrics are null, not NaN/Infinity", () => {
    const r = calculateEtfProjection({
      initialInvestment: 0,
      monthlyInvestment: 0,
      years: 10,
      expectedAnnualReturnPct: 8,
      annualFeePct: 0.15,
      distributionYieldPct: 0,
      reinvestDistributions: true,
    });
    expect(r.totalContributions).toBe(0);
    expect(r.endingPortfolioValue).toBe(0);
    expect(r.totalReturnPct).toBeNull();
    expect(r.annualizedReturnPct).toBeNull();
    expect(r.moneyMultiple).toBeNull();
  });

  it("extremely large values compute without overflowing to Infinity", () => {
    const r = calculateEtfProjection({
      initialInvestment: 1_000_000_000,
      monthlyInvestment: 1_000_000,
      years: 40,
      expectedAnnualReturnPct: 10,
      annualFeePct: 0.1,
      distributionYieldPct: 2,
      reinvestDistributions: true,
    });
    expect(Number.isFinite(r.endingPortfolioValue)).toBe(true);
    expect(Number.isFinite(r.totalReturnPct ?? 0)).toBe(true);
  });

  it("negative raw inputs are clamped to 0 by sanitizeCalculatorInputs rather than producing a negative-principal scenario", () => {
    const s = sanitizeCalculatorInputs({ initialInvestment: -500, monthlyInvestment: -10, annualFeePct: -1, distributionYieldPct: -5 });
    expect(s.initialInvestment).toBe(0);
    expect(s.monthlyInvestment).toBe(0);
    expect(s.annualFeePct).toBe(0);
    expect(s.distributionYieldPct).toBe(0);
  });

  it("years beyond the 60-year cap are clamped, not left unbounded", () => {
    const s = sanitizeCalculatorInputs({ years: 500 });
    expect(s.years).toBe(60);
  });
});
