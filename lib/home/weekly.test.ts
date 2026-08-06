import { describe, it, expect } from "vitest";
import { buildWeeklyIntelligence } from "./weekly";
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
    type: "distribution_event",
    title: "AAA declared $0.30",
    body: "",
    occurredAt: "2026-08-03T10:00:00Z",
    sourceUrl: null,
    supportingMetrics: null,
    language: "en",
    ...overrides,
  };
}

describe("buildWeeklyIntelligence", () => {
  it("buckets real change events by their real type", () => {
    const result = buildWeeklyIntelligence(
      [],
      [
        event({ type: "distribution_event", ticker: "TSLY" }),
        event({ type: "score_change", ticker: "PLTY" }),
        event({ type: "risk_level_change", ticker: "MSTY" }),
        event({ type: "prediction_change", ticker: "QDTE" }),
      ],
      today
    );
    expect(result.distributions.map((r) => r.ticker)).toEqual(["TSLY"]);
    expect(result.scoreChanges.map((r) => r.ticker)).toEqual(["PLTY"]);
    expect(result.riskLevelChanges.map((r) => r.ticker)).toEqual(["MSTY"]);
    expect(result.predictionChanges.map((r) => r.ticker)).toEqual(["QDTE"]);
  });

  it("finds real upcoming ex-dates within the next 7 days, sorted soonest-first", () => {
    const result = buildWeeklyIntelligence(
      [
        snap({ ticker: "A", nextPredictedExDate: "2026-08-11" }),
        snap({ ticker: "B", nextPredictedExDate: "2026-08-06" }),
        snap({ ticker: "C", nextPredictedExDate: "2026-09-01" }), // outside window
      ],
      [],
      today
    );
    expect(result.upcomingExDates.map((r) => r.ticker)).toEqual(["B", "A"]);
  });

  it("flags real, notable distribution-trend movers as yield movers, sorted by magnitude", () => {
    const result = buildWeeklyIntelligence(
      [
        snap({ ticker: "BIG", dividendTrendPct: 22.5 }),
        snap({ ticker: "SMALL", dividendTrendPct: 1.2 }), // below threshold, excluded
        snap({ ticker: "DROP", dividendTrendPct: -14.0 }),
      ],
      [],
      today
    );
    expect(result.yieldMovers.map((r) => r.ticker)).toEqual(["BIG", "DROP"]);
  });

  it("returns empty buckets honestly when no real events exist", () => {
    const result = buildWeeklyIntelligence([], [], today);
    expect(result.predictionChanges).toEqual([]);
    expect(result.riskLevelChanges).toEqual([]);
  });
});
