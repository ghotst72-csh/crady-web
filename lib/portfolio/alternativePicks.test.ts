import { describe, it, expect } from "vitest";
import { pickAlternatives } from "./alternativePicks";
import type { EtfSnapshot } from "@/lib/data";

function snap(overrides: Partial<EtfSnapshot> & { ticker: string }): EtfSnapshot {
  return {
    provider_id: "yieldmax",
    name: null,
    payoutFrequency: "weekly",
    price: 20,
    cradyScore: 50,
    riskLevel: "NORMAL",
    volatility30d: 10,
    dividendStabilityScore: 50,
    annualYieldPct: 60,
    latestDividend: null,
    latestDividendDate: null,
    nextPredictedAmount: null,
    nextPredictedDate: null,
    nextPredictedExDate: null,
    nextPredictedConfidence: null,
    dividendTrend: null,
    dividendTrendPct: null,
    calculatedAt: null,
    ...overrides,
  };
}

const providerLabelFn = (id: string) => (id === "yieldmax" ? "YieldMax" : id === "roundhill" ? "Roundhill" : "Defiance");

describe("pickAlternatives", () => {
  it("returns empty when the target ticker isn't in the snapshot", () => {
    expect(pickAlternatives("NOPE", [snap({ ticker: "TSLY" })], providerLabelFn)).toEqual([]);
  });

  it("never repeats a ticker across categories", () => {
    const target = snap({ ticker: "TSLY", riskLevel: "EXTREME", dividendStabilityScore: 10, volatility30d: 40, annualYieldPct: 70 });
    // one single alternative that would otherwise win every category
    const winner = snap({
      ticker: "WINNER",
      cradyScore: 99,
      riskLevel: "SAFE",
      dividendStabilityScore: 99,
      volatility30d: 5,
      annualYieldPct: 71, // closest to target's 70 too
    });
    const picks = pickAlternatives("TSLY", [target, winner], providerLabelFn);
    const tickers = picks.map((p) => p.ticker);
    // WINNER can only appear once even though it qualifies for multiple categories
    expect(tickers.filter((t) => t === "WINNER").length).toBeLessThanOrEqual(1);
  });

  it("picks the best-CRADY-Score same-provider peer", () => {
    const target = snap({ ticker: "TSLY", provider_id: "yieldmax", cradyScore: 40 });
    const weakPeer = snap({ ticker: "WEAK", provider_id: "yieldmax", cradyScore: 45 });
    const strongPeer = snap({ ticker: "STRONG", provider_id: "yieldmax", cradyScore: 80 });
    const otherProvider = snap({ ticker: "OTHER", provider_id: "roundhill", cradyScore: 99 });
    const picks = pickAlternatives("TSLY", [target, weakPeer, strongPeer, otherProvider], providerLabelFn);
    const sameProviderPick = picks.find((p) => p.category === "same-provider");
    expect(sameProviderPick?.ticker).toBe("STRONG");
  });

  it("does not invent a lower-risk pick when nothing genuinely qualifies", () => {
    const target = snap({ ticker: "TSLY", riskLevel: "SAFE" }); // already the best bucket
    const other = snap({ ticker: "OTHER", riskLevel: "NORMAL" });
    const picks = pickAlternatives("TSLY", [target, other], providerLabelFn);
    expect(picks.find((p) => p.category === "lower-risk-income")).toBeUndefined();
  });

  it("picks a genuinely lower-risk candidate when one exists", () => {
    const target = snap({ ticker: "TSLY", provider_id: "yieldmax", riskLevel: "EXTREME", annualYieldPct: 60 });
    // a same-risk decoy that's the closest yield match, so similar-income
    // claims it instead of SAFER, isolating the lower-risk category
    const decoy = snap({ ticker: "DECOY", provider_id: "roundhill", riskLevel: "EXTREME", annualYieldPct: 60, dividendStabilityScore: null });
    const safer = snap({ ticker: "SAFER", provider_id: "defiance", riskLevel: "SAFE", annualYieldPct: 30, dividendStabilityScore: null });
    const picks = pickAlternatives("TSLY", [target, decoy, safer], providerLabelFn);
    expect(picks.find((p) => p.category === "similar-income")?.ticker).toBe("DECOY");
    expect(picks.find((p) => p.category === "lower-risk-income")?.ticker).toBe("SAFER");
  });

  it("does not pick a better-income-stability alternative without a strictly higher score", () => {
    const target = snap({ ticker: "TSLY", dividendStabilityScore: 90 });
    const other = snap({ ticker: "OTHER", dividendStabilityScore: 90 }); // tied, not strictly better
    const picks = pickAlternatives("TSLY", [target, other], providerLabelFn);
    expect(picks.find((p) => p.category === "better-income-stability")).toBeUndefined();
  });

  it("computes risk-adjusted efficiency as yield / volatility and requires strict improvement", () => {
    const target = snap({ ticker: "TSLY", provider_id: "yieldmax", annualYieldPct: 60, volatility30d: 20 }); // efficiency 3.0
    // a near-identical-yield decoy so the similar-income category claims it
    // instead of BETTER, isolating the risk-adjusted category cleanly
    const decoy = snap({ ticker: "DECOY", provider_id: "roundhill", riskLevel: null, dividendStabilityScore: null, annualYieldPct: 61, volatility30d: 50 }); // efficiency 1.22
    const better = snap({ ticker: "BETTER", provider_id: "defiance", riskLevel: null, dividendStabilityScore: null, annualYieldPct: 40, volatility30d: 5 }); // efficiency 8.0, worse yield-match
    const picks = pickAlternatives("TSLY", [target, decoy, better], providerLabelFn);
    expect(picks.find((p) => p.category === "similar-income")?.ticker).toBe("DECOY");
    expect(picks.find((p) => p.category === "better-risk-adjusted")?.ticker).toBe("BETTER");
  });

  it("every returned pick has a non-empty, ticker-specific reason sentence", () => {
    const target = snap({ ticker: "TSLY" });
    const alt = snap({ ticker: "ALT", cradyScore: 90 });
    const picks = pickAlternatives("TSLY", [target, alt], providerLabelFn);
    for (const p of picks) {
      expect(p.reason.length).toBeGreaterThan(10);
      expect(p.reason).toContain(p.ticker);
    }
  });
});
