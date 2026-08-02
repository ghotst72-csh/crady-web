import { describe, it, expect } from "vitest";
import {
  buildWhyInvestorsBuy,
  buildBiggestRisks,
  buildWhoShouldAvoid,
  buildHistoricalCharacteristics,
  type EnrichmentInput,
} from "./enrichment";

const BASE: EnrichmentInput = {
  ticker: "TSLY",
  providerId: "yieldmax",
  investmentStrategy: null,
  annualYieldPct: 76.3,
  payoutFrequency: "weekly",
  riskLevel: null,
  maxDrawdownPct: null,
  volatility90dPct: null,
  dividendStabilityScore: null,
  trend12mo: null,
};

describe("buildWhyInvestorsBuy", () => {
  it("falls back to yield/frequency fact when no strategy text exists", () => {
    const text = buildWhyInvestorsBuy(BASE, "en");
    expect(text).toContain("TSLY");
    expect(text).toContain("76.3%");
  });

  it("uses real strategy text when present", () => {
    const text = buildWhyInvestorsBuy({ ...BASE, investmentStrategy: "Sells calls on TSLA." }, "en");
    expect(text).toContain("Sells calls on TSLA.");
  });
});

describe("buildBiggestRisks", () => {
  it("returns null when there is no risk data at all", () => {
    expect(buildBiggestRisks(BASE, null, "en")).toBeNull();
  });

  it("surfaces real risk_summary text", () => {
    const text = buildBiggestRisks(BASE, "High volatility underlying.", "en");
    expect(text).toContain("High volatility underlying.");
  });

  it("surfaces max drawdown even with no risk_summary", () => {
    const text = buildBiggestRisks({ ...BASE, maxDrawdownPct: -42.5 }, null, "en");
    expect(text).toContain("-42.5%");
  });
});

describe("buildWhoShouldAvoid", () => {
  it("returns null when risk level is unknown", () => {
    expect(buildWhoShouldAvoid(BASE, "en")).toBeNull();
  });

  it("flags conservative investors for RISKY/EXTREME", () => {
    const text = buildWhoShouldAvoid({ ...BASE, riskLevel: "EXTREME" }, "en");
    expect(text).toMatch(/conservative/i);
  });
});

describe("buildHistoricalCharacteristics", () => {
  it("returns null when there is no trend data", () => {
    expect(buildHistoricalCharacteristics(BASE, "en")).toBeNull();
  });

  it("summarizes real increase/decrease counts", () => {
    const text = buildHistoricalCharacteristics(
      { ...BASE, trend12mo: { avgChangePct: -1.2, increases: 4, decreases: 8, count: 12 } },
      "en"
    );
    expect(text).toContain("12 distributions");
    expect(text).toContain("4 increases");
    expect(text).toContain("8 decreases");
  });
});
