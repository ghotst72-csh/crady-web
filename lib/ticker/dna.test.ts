import { describe, it, expect } from "vitest";
import { buildEtfDna, type DnaInput } from "./dna";

const FULL: DnaInput = {
  incomeScore: 58.52,
  momentumScore: 0,
  riskLevel: "NORMAL",
  recoveryScore: 0,
  dividendStabilityScore: 88.93,
  safetyScore: 32.56,
  trendScore: 7.95,
};

describe("buildEtfDna", () => {
  it("maps real scores to 1-5 stars", () => {
    const dna = buildEtfDna(FULL);
    expect(dna.income).toBe(3); // 58.52/20 rounds to 3
    expect(dna.stability).toBe(4); // 88.93/20 rounds to 4 (clamped to 5 max)
    expect(dna.risk).toBe(2); // NORMAL
  });

  it("treats 0 as a real data point, not missing — still gets a star rating", () => {
    const dna = buildEtfDna(FULL);
    expect(dna.growth).toBe(1);
    expect(dna.recovery).toBe(1);
  });

  it("omits a trait entirely when its source is null, rather than fabricating a middle value", () => {
    const dna = buildEtfDna({ ...FULL, incomeScore: null, riskLevel: null });
    expect(dna.income).toBeUndefined();
    expect(dna.risk).toBeUndefined();
    expect(dna.stability).toBeDefined(); // unaffected
  });

  it("dataConfidence reflects how many of the 5 sub-scores are actually populated", () => {
    const full = buildEtfDna(FULL);
    const sparse = buildEtfDna({
      incomeScore: null,
      momentumScore: null,
      riskLevel: "EXTREME",
      recoveryScore: null,
      dividendStabilityScore: 60,
      safetyScore: null,
      trendScore: null,
    });
    expect(full.dataConfidence).toBeGreaterThan(sparse.dataConfidence!);
    expect(sparse.dataConfidence).toBeGreaterThanOrEqual(1); // never 0
  });
});
