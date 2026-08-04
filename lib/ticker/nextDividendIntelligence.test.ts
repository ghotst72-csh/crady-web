import { describe, it, expect } from "vitest";
import {
  buildDividendSchedule,
  computeTypicalDeclarationToExDays,
  computeExpectedRange,
  classifyEtfType,
  buildEstimateDrivers,
  buildTrackRecord,
  buildSchedulePattern,
} from "./nextDividendIntelligence";

describe("buildDividendSchedule", () => {
  it("marks all 4 dates 'scheduled' when a real scraped schedule row exists, even though the amount is still pending", () => {
    const s = buildDividendSchedule({
      scheduleRow: {
        declarationDate: "2026-08-05",
        exDate: "2026-08-06",
        recordDate: "2026-08-06",
        payDate: "2026-08-07",
        sourceUrl: "https://yieldmaxetfs.com/distribution-schedule/",
      },
      prediction: null,
      typicalDeclarationToExDays: null,
    });
    expect(s.declaration).toEqual({ date: "2026-08-05", status: "scheduled" });
    expect(s.exDividend).toEqual({ date: "2026-08-06", status: "scheduled" });
    expect(s.payment).toEqual({ date: "2026-08-07", status: "scheduled" });
  });

  it("never marks a next-cycle date 'official' — official belongs only to already-declared amounts, handled elsewhere", () => {
    const s = buildDividendSchedule({
      scheduleRow: { declarationDate: "2026-08-05", exDate: "2026-08-06", recordDate: "2026-08-06", payDate: "2026-08-07", sourceUrl: "x" },
      prediction: null,
      typicalDeclarationToExDays: null,
    });
    expect(Object.values(s).every((d) => d.status !== "official")).toBe(true);
  });

  it("falls back to CRADY's pattern-based prediction, marked 'estimated', when no schedule row exists yet", () => {
    const s = buildDividendSchedule({
      scheduleRow: null,
      prediction: { targetExDate: "2026-08-06", targetPayDate: "2026-08-07" },
      typicalDeclarationToExDays: 1,
    });
    expect(s.exDividend).toEqual({ date: "2026-08-06", status: "estimated" });
    expect(s.payment).toEqual({ date: "2026-08-07", status: "estimated" });
    expect(s.declaration.status).toBe("estimated");
    expect(s.declaration.date).toBe("2026-08-05"); // 1 day before ex-date
  });

  it("marks declaration 'awaiting' when there's no typical gap to extrapolate from", () => {
    const s = buildDividendSchedule({
      scheduleRow: null,
      prediction: { targetExDate: "2026-08-06", targetPayDate: "2026-08-07" },
      typicalDeclarationToExDays: null,
    });
    expect(s.declaration.status).toBe("awaiting");
    expect(s.declaration.date).toBeNull();
  });

  it("returns all-unavailable when there's neither a schedule row nor a prediction", () => {
    const s = buildDividendSchedule({ scheduleRow: null, prediction: null, typicalDeclarationToExDays: null });
    expect(Object.values(s).every((d) => d.status === "unavailable" && d.date === null)).toBe(true);
  });
});

describe("computeTypicalDeclarationToExDays", () => {
  it("averages real gaps between declaration and ex-date", () => {
    const gap = computeTypicalDeclarationToExDays([
      { declarationDate: "2026-08-05", exDate: "2026-08-06" }, // 1 day
      { declarationDate: "2026-07-29", exDate: "2026-07-30" }, // 1 day
    ]);
    expect(gap).toBe(1);
  });

  it("returns null when no recent row has a declaration date", () => {
    expect(computeTypicalDeclarationToExDays([{ declarationDate: null, exDate: "2026-08-06" }])).toBeNull();
  });

  it("discards an implausible gap (e.g. negative or > 14 days) as not a real 'typical' pattern", () => {
    const gap = computeTypicalDeclarationToExDays([{ declarationDate: "2026-01-01", exDate: "2026-08-06" }]);
    expect(gap).toBeNull();
  });
});

describe("computeExpectedRange", () => {
  it("computes a symmetric range from real standard deviation", () => {
    const r = computeExpectedRange([0.28, 0.30, 0.32], 0.30);
    expect(r).not.toBeNull();
    expect(r!.high).toBeGreaterThan(0.30);
    expect(r!.low).toBeLessThan(0.30);
  });

  it("returns null (never a fabricated range) below the minimum sample size", () => {
    expect(computeExpectedRange([0.3, 0.31], 0.3)).toBeNull();
  });

  it("never returns a negative low bound", () => {
    const r = computeExpectedRange([0.01, 5, 0.02], 0.5);
    expect(r!.low).toBeGreaterThanOrEqual(0);
  });
});

describe("classifyEtfType", () => {
  it("classifies single-stock when underlyingTicker is present, regardless of other fields", () => {
    expect(classifyEtfType({ strategyType: null, underlyingTicker: "TSLA", assetClass: "Options Income ETF" })).toBe("single-stock-covered-call");
  });

  it("classifies 0DTE index products correctly from asset_class, the field populated for the whole universe", () => {
    expect(classifyEtfType({ strategyType: null, underlyingTicker: null, assetClass: "0DTE Covered Call ETF" })).toBe("index-covered-call");
  });

  it("falls back sensibly when neither underlying_ticker nor a recognized asset_class is set", () => {
    expect(classifyEtfType({ strategyType: null, underlyingTicker: null, assetClass: null })).toBe("index-covered-call");
  });
});

describe("buildEstimateDrivers", () => {
  it("never assigns a fabricated percentage — only qualitative influence levels", () => {
    const drivers = buildEstimateDrivers({ recentAmountsCount: 5, hasVolatilityData: true, hasUnderlyingPriceData: false, isOfficiallyDeclared: false });
    for (const d of drivers) {
      expect(["high", "medium", "low", "unavailable"]).toContain(d.influence);
    }
  });

  it("marks official declaration as unavailable for a still-pending estimate", () => {
    const drivers = buildEstimateDrivers({ recentAmountsCount: 5, hasVolatilityData: true, hasUnderlyingPriceData: true, isOfficiallyDeclared: false });
    expect(drivers.find((d) => d.key === "officialDeclaration")?.influence).toBe("unavailable");
  });

  it("marks recent distribution history as high influence only with enough real samples", () => {
    const rich = buildEstimateDrivers({ recentAmountsCount: 4, hasVolatilityData: false, hasUnderlyingPriceData: false, isOfficiallyDeclared: false });
    const thin = buildEstimateDrivers({ recentAmountsCount: 0, hasVolatilityData: false, hasUnderlyingPriceData: false, isOfficiallyDeclared: false });
    expect(rich.find((d) => d.key === "recentDistributionHistory")?.influence).toBe("high");
    expect(thin.find((d) => d.key === "recentDistributionHistory")?.influence).toBe("unavailable");
  });
});

describe("buildTrackRecord", () => {
  it("returns null below the minimum sample size, never a fabricated accuracy figure", () => {
    expect(buildTrackRecord([{ targetPayDate: "2026-08-01", predictedAmount: 0.3, actualAmount: 0.29, percentageError: 3.4 }])).toBeNull();
  });

  it("matches the real TSLY case: a large sample with consistently high error should NOT be dressed up as accurate", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      targetPayDate: `2026-0${(i % 9) + 1}-01`,
      predictedAmount: 0.33,
      actualAmount: 0.22,
      percentageError: 50,
    }));
    const tr = buildTrackRecord(rows);
    expect(tr).not.toBeNull();
    expect(tr!.averageAbsoluteErrorPct).toBeCloseTo(50, 5);
    expect(tr!.withinRangeCount).toBe(0);
  });

  it("counts predictions within the stated error threshold as 'within range'", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => ({ targetPayDate: `d${i}`, predictedAmount: 0.3, actualAmount: 0.29, percentageError: 3 })),
      ...Array.from({ length: 3 }, (_, i) => ({ targetPayDate: `e${i}`, predictedAmount: 0.3, actualAmount: 0.15, percentageError: 100 })),
    ];
    const tr = buildTrackRecord(rows);
    expect(tr!.count).toBe(8);
    expect(tr!.withinRangeCount).toBe(5);
  });
});

describe("buildSchedulePattern", () => {
  it("reports a consistent weekday only when the whole sample actually agrees", () => {
    const p = buildSchedulePattern([
      { declarationDate: "2026-08-05", exDate: "2026-08-06", payDate: "2026-08-07" }, // Wed/Thu/Fri
      { declarationDate: "2026-07-29", exDate: "2026-07-30", payDate: "2026-07-31" }, // Wed/Thu/Fri
    ]);
    expect(p?.declarationWeekday).toBe("Wednesday");
    expect(p?.exDividendWeekday).toBe("Thursday");
    expect(p?.paymentWeekday).toBe("Friday");
    expect(p?.isConsistent).toBe(true);
  });

  it("returns null for a field when the sample disagrees, rather than picking a plurality", () => {
    const p = buildSchedulePattern([
      { declarationDate: null, exDate: "2026-08-06", payDate: "2026-08-07" }, // Thursday
      { declarationDate: null, exDate: "2026-08-10", payDate: "2026-08-11" }, // Monday
    ]);
    expect(p?.exDividendWeekday).toBeNull();
    expect(p?.isConsistent).toBe(false);
  });

  it("returns null entirely for an empty sample", () => {
    expect(buildSchedulePattern([])).toBeNull();
  });
});
