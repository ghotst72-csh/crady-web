import { describe, it, expect } from "vitest";
import { buildDailySummary, type AiSummaryInput } from "./aiSummary";
import { computeScoreBreakdown } from "./scoreExplain";
import { buildRiskContext } from "./riskExplain";
import { buildYieldExplanation } from "./yieldExplain";

const FULL: AiSummaryInput = {
  ticker: "TSLY",
  directAnswer: "TSLY's next dividend is expected around $0.32 per share.",
  notes: "TSLA 기반 고변동성 수익형 ETF",
  yieldExplanation: buildYieldExplanation(
    { annualYieldPct: 73.6, payoutFrequency: "weekly", dividendTrend: "flat", dividendTrendPct: 0, recentReturn30d: -23 },
    "en"
  ),
  scoreBreakdown: computeScoreBreakdown({
    cradyScore: 33.63,
    riskLevel: "NORMAL",
    dividendStabilityScore: 88.93,
    recoveryScore: 0,
    maxDrawdown: -90.58,
    volatility30d: 65.72,
    trendScore: 7.95,
    momentumScore: 0,
  }),
  riskContext: buildRiskContext({
    riskLevel: "NORMAL",
    volatility30d: 65.72,
    volatility90d: 47.34,
    maxDrawdown: -90.58,
    dividendStabilityScore: 88.93,
  }),
};

describe("buildDailySummary", () => {
  it("produces multiple real sentences when all inputs are present", () => {
    const sentences = buildDailySummary(FULL, "ko");
    expect(sentences.length).toBeGreaterThanOrEqual(5);
    expect(sentences.every((s) => s.length > 0)).toBe(true);
  });

  it("degrades honestly to fewer sentences for a low-data ticker, never padding with filler", () => {
    const sparse = buildDailySummary(
      { ticker: "XYZ", directAnswer: null, notes: null, yieldExplanation: null, scoreBreakdown: null, riskContext: null },
      "en"
    );
    expect(sparse).toEqual([]);
  });

  it("includes the real pipeline notes field on the Korean summary, since notes is Korean-authored", () => {
    const sentences = buildDailySummary(FULL, "ko");
    expect(sentences).toContain("TSLA 기반 고변동성 수익형 ETF");
  });

  it("never mixes in the Korean-only notes field on the English summary", () => {
    const sentences = buildDailySummary(FULL, "en");
    expect(sentences).not.toContain("TSLA 기반 고변동성 수익형 ETF");
  });
});
