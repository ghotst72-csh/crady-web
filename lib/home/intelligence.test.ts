import { describe, it, expect } from "vitest";
import { buildHomeIntelligence } from "./intelligence";
import type { EtfSnapshot } from "@/lib/data";
import type { AutomatedActivityItem } from "@/lib/activity/types";

const today = new Date("2026-08-05T12:00:00Z");

function snap(overrides: Partial<EtfSnapshot>): EtfSnapshot {
  return {
    ticker: "AAA",
    provider_id: "yieldmax",
    name: null,
    payoutFrequency: null,
    price: 10,
    cradyScore: null,
    riskLevel: null,
    volatility30d: null,
    dividendStabilityScore: null,
    annualYieldPct: null,
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

function event(overrides: Partial<AutomatedActivityItem>): AutomatedActivityItem {
  return {
    id: "1",
    ticker: "AAA",
    source: "crady",
    type: "score_change",
    title: "AAA CRADY Score changed",
    body: "",
    occurredAt: "2026-08-05T10:00:00Z",
    sourceUrl: null,
    supportingMetrics: null,
    language: "en",
    ...overrides,
  };
}

describe("buildHomeIntelligence", () => {
  it("real score_change events populate todayChanged with real before/after values", () => {
    const result = buildHomeIntelligence(
      [],
      [event({ type: "score_change", ticker: "PLTY", supportingMetrics: { score: 58.48, previous_score: 62.41 } })],
      "en",
      today
    );
    expect(result.todayChanged).toHaveLength(1);
    expect(result.todayChanged[0].ticker).toBe("PLTY");
    expect(result.todayChanged[0].label).toContain("62.4");
  });

  it("returns empty arrays honestly when no real change events exist — never fabricated", () => {
    const result = buildHomeIntelligence([], [], "en", today);
    expect(result.todayChanged).toEqual([]);
    expect(result.predictionRaised).toEqual([]);
    expect(result.predictionLowered).toEqual([]);
  });

  it("splits prediction_change events by real direction when both amounts are present", () => {
    const result = buildHomeIntelligence(
      [],
      [
        event({ type: "prediction_change", ticker: "TSLY", supportingMetrics: { predicted_amount: 0.31, previous_amount: 0.29 } }),
        event({ type: "prediction_change", ticker: "MSTY", supportingMetrics: { predicted_amount: 0.9, previous_amount: 1.1 } }),
      ],
      "en",
      today
    );
    expect(result.predictionRaised.map((r) => r.ticker)).toEqual(["TSLY"]);
    expect(result.predictionLowered.map((r) => r.ticker)).toEqual(["MSTY"]);
  });

  it("derives tomorrowExDate purely from the snapshot's real nextPredictedExDate field", () => {
    const result = buildHomeIntelligence(
      [snap({ ticker: "QDTE", nextPredictedExDate: "2026-08-06", nextPredictedAmount: 0.5 }), snap({ ticker: "RDTE", nextPredictedExDate: "2026-08-10" })],
      [],
      "en",
      today
    );
    expect(result.tomorrowExDate.map((r) => r.ticker)).toEqual(["QDTE"]);
  });
});
