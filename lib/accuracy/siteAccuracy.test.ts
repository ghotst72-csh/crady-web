import { describe, it, expect } from "vitest";
import { computeSiteAccuracy, computeTickerAccuracy } from "./siteAccuracy";
import type { SitewideEvaluatedPredictionRow } from "@/lib/distributions/data";

function row(overrides: Partial<SitewideEvaluatedPredictionRow>): SitewideEvaluatedPredictionRow {
  return {
    ticker: "TSLY",
    targetPayDate: "2026-08-01",
    predictedAmount: 0.3,
    actualAmount: 0.31,
    percentageError: 5,
    evaluationStatus: "matched",
    ...overrides,
  };
}

describe("computeSiteAccuracy", () => {
  it("counts real evaluation_status categories as-is, never inventing a bucket", () => {
    const rows = [
      row({ evaluationStatus: "matched", percentageError: 2 }),
      row({ evaluationStatus: "close", percentageError: 12 }),
      row({ evaluationStatus: "high_error", percentageError: 40 }),
    ];
    const result = computeSiteAccuracy(rows);
    expect(result.statusCounts).toEqual({ matched: 1, close: 1, high_error: 1 });
    expect(result.evaluatedCount).toBe(3);
  });

  it("computes average and median absolute error from real percentageError values", () => {
    const rows = [
      row({ percentageError: 10 }),
      row({ percentageError: -20 }),
      row({ percentageError: 30 }),
    ];
    const result = computeSiteAccuracy(rows);
    expect(result.averageAbsoluteErrorPct).toBeCloseTo(20, 5);
    expect(result.medianAbsoluteErrorPct).toBe(20);
  });

  it("counts within-10/15/25 bands honestly against absolute error", () => {
    const rows = [row({ percentageError: 5 }), row({ percentageError: 12 }), row({ percentageError: 40 })];
    const result = computeSiteAccuracy(rows);
    expect(result.withinRangeCounts).toEqual({ within10: 1, within15: 2, within25: 2 });
  });

  it("counts distinct tickers, not raw rows", () => {
    const rows = [row({ ticker: "TSLY" }), row({ ticker: "TSLY" }), row({ ticker: "MSTY" })];
    expect(computeSiteAccuracy(rows).tickerCount).toBe(2);
  });

  it("returns nulls honestly when there is no data", () => {
    const result = computeSiteAccuracy([]);
    expect(result.averageAbsoluteErrorPct).toBeNull();
    expect(result.medianAbsoluteErrorPct).toBeNull();
  });
});

describe("computeTickerAccuracy", () => {
  it("excludes tickers below the minimum sample size", () => {
    const rows = [
      row({ ticker: "TSLY", percentageError: 5 }),
      row({ ticker: "TSLY", percentageError: 10 }),
      row({ ticker: "ONLY_ONE", percentageError: 5 }),
    ];
    const result = computeTickerAccuracy(rows, 3);
    expect(result.find((r) => r.ticker === "ONLY_ONE")).toBeUndefined();
    expect(result.find((r) => r.ticker === "TSLY")).toBeUndefined(); // only 2 rows, still below min 3
  });

  it("sorts by lowest average absolute error first", () => {
    const rows = [
      ...Array(3).fill(0).map(() => row({ ticker: "GOOD", percentageError: 2 })),
      ...Array(3).fill(0).map(() => row({ ticker: "BAD", percentageError: 40 })),
    ];
    const result = computeTickerAccuracy(rows, 3);
    expect(result.map((r) => r.ticker)).toEqual(["GOOD", "BAD"]);
  });
});
