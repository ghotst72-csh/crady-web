import { describe, it, expect } from "vitest";
import {
  resolveNextDividend,
  buildWeekLabel,
  buildMonthLabel,
  buildOutlookArticle,
  buildEligibilityNote,
  buildNextDividendSeoFaq,
  RECENT_OFFICIAL_WINDOW_DAYS,
  MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT,
  type ResolvedNextDividend,
} from "./nextDividendSeoArticle";
import type { NextDividendIntelligenceData } from "./buildNextDividendIntelligenceData";
import type { OfficialDistributionForTicker } from "@/lib/distributions/data";

function baseIntelligence(overrides: Partial<NextDividendIntelligenceData> = {}): NextDividendIntelligenceData {
  return {
    ticker: "TSLY",
    schedule: {
      declaration: { date: "2026-08-10", status: "estimated" },
      exDividend: { date: "2026-08-19", status: "estimated" },
      record: { date: "2026-08-19", status: "estimated" },
      payment: { date: "2026-08-20", status: "estimated" },
    },
    isOfficial: false,
    officialAmount: null,
    pointEstimate: 0.5238,
    expectedRange: { low: 0.5099, high: 0.5377 },
    confidence: 0.84,
    previousAmount: 0.51,
    whyThisEstimate: "",
    drivers: [],
    recentAmounts: [0.51, 0.49, 0.53],
    avg4: 0.51,
    avg12: 0.5,
    schedulePattern: null,
    trackRecord: null,
    forecastVsOfficial: null,
    ...overrides,
  };
}

const NO_OFFICIAL: OfficialDistributionForTicker | null = null;

describe("resolveNextDividend", () => {
  it("uses the estimate when no official distribution exists yet", () => {
    const resolved = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence(),
      officialDistribution: NO_OFFICIAL,
      todayIso: "2026-08-15",
    });
    expect(resolved.isOfficial).toBe(false);
    expect(resolved.amount).toBe(0.5238);
    expect(resolved.exDate).toBe("2026-08-19");
    expect(resolved.expectedRange).toEqual({ low: 0.5099, high: 0.5377 });
  });

  it("switches to official when a real distribution was paid within the recent window", () => {
    const official: OfficialDistributionForTicker = {
      ticker: "TSLY",
      amount: 0.5301,
      distributionRate: null,
      secYield30d: null,
      rocPercent: null,
      exDate: "2026-08-12",
      payDate: "2026-08-13",
      declarationDate: "2026-08-11",
      sourceUrl: "https://yieldmaxetfs.com/our-etfs/tsly/",
      announcementDate: null,
      announcementTitle: null,
      announcementSourceUrl: null,
    };
    const resolved = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence(),
      officialDistribution: official,
      // 2 days after payDate -- well within RECENT_OFFICIAL_WINDOW_DAYS
      todayIso: "2026-08-15",
    });
    expect(resolved.isOfficial).toBe(true);
    expect(resolved.amount).toBe(0.5301);
    expect(resolved.exDate).toBe("2026-08-12");
    expect(resolved.confidence).toBeNull();
    expect(resolved.expectedRange).toBeNull();
  });

  it("falls back to the estimate when the last official distribution is old news", () => {
    const staleOfficial: OfficialDistributionForTicker = {
      ticker: "TSLY",
      amount: 0.49,
      distributionRate: null,
      secYield30d: null,
      rocPercent: null,
      exDate: "2026-06-01",
      payDate: "2026-06-02",
      declarationDate: "2026-05-31",
      sourceUrl: "x",
      announcementDate: null,
      announcementTitle: null,
      announcementSourceUrl: null,
    };
    const resolved = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence(),
      officialDistribution: staleOfficial,
      todayIso: "2026-08-15", // ~75 days after payDate, way past the window
    });
    expect(resolved.isOfficial).toBe(false);
    expect(resolved.amount).toBe(0.5238);
  });

  it("treats a declared-but-not-yet-paid distribution as official immediately (payDate in the future)", () => {
    const justDeclared: OfficialDistributionForTicker = {
      ticker: "TSLY",
      amount: 0.5301,
      distributionRate: null,
      secYield30d: null,
      rocPercent: null,
      exDate: "2026-08-19",
      payDate: "2026-08-20", // still in the future relative to todayIso
      declarationDate: "2026-08-18",
      sourceUrl: "x",
      announcementDate: null,
      announcementTitle: null,
      announcementSourceUrl: null,
    };
    const resolved = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence(),
      officialDistribution: justDeclared,
      todayIso: "2026-08-18",
    });
    expect(resolved.isOfficial).toBe(true);
    expect(resolved.amount).toBe(0.5301);
  });

  it("only surfaces a prediction-vs-official comparison when the forecast's actual amount exactly matches the official amount", () => {
    const official: OfficialDistributionForTicker = {
      ticker: "TSLY",
      amount: 0.5301,
      distributionRate: null,
      secYield30d: null,
      rocPercent: null,
      exDate: "2026-08-12",
      payDate: "2026-08-13",
      declarationDate: "2026-08-11",
      sourceUrl: "x",
      announcementDate: null,
      announcementTitle: null,
      announcementSourceUrl: null,
    };

    const matching = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence({
        forecastVsOfficial: { predictedAmount: 0.5238, actualAmount: 0.5301, errorPct: 1.2 },
      }),
      officialDistribution: official,
      todayIso: "2026-08-15",
    });
    expect(matching.comparisonToPrediction).toEqual({ predictedAmount: 0.5238, actualAmount: 0.5301, errorPct: 1.2 });

    const mismatched = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence({
        // actualAmount here refers to a DIFFERENT resolved event than the
        // current official row -- must not be shown as if it matched.
        forecastVsOfficial: { predictedAmount: 0.49, actualAmount: 0.5, errorPct: 2 },
      }),
      officialDistribution: official,
      todayIso: "2026-08-15",
    });
    expect(mismatched.comparisonToPrediction).toBeNull();
  });

  it("RECENT_OFFICIAL_WINDOW_DAYS boundary is inclusive", () => {
    const official: OfficialDistributionForTicker = {
      ticker: "TSLY",
      amount: 0.5,
      distributionRate: null,
      secYield30d: null,
      rocPercent: null,
      exDate: "2026-08-01",
      payDate: "2026-08-01",
      declarationDate: null,
      sourceUrl: null,
      announcementDate: null,
      announcementTitle: null,
      announcementSourceUrl: null,
    };
    const exactlyAtBoundary = new Date("2026-08-01T00:00:00Z");
    exactlyAtBoundary.setUTCDate(exactlyAtBoundary.getUTCDate() + RECENT_OFFICIAL_WINDOW_DAYS);
    const todayIso = exactlyAtBoundary.toISOString().slice(0, 10);

    const resolved = resolveNextDividend({
      ticker: "TSLY",
      intelligence: baseIntelligence(),
      officialDistribution: official,
      todayIso,
    });
    expect(resolved.isOfficial).toBe(true);
  });
});

describe("buildWeekLabel", () => {
  it("builds a Monday-Friday span within the same month", () => {
    // 2026-08-19 is a Wednesday
    expect(buildWeekLabel("2026-08-19", "en")).toBe("August 17-21, 2026");
  });

  it("handles a span crossing a month boundary", () => {
    // 2026-07-29 is a Wednesday -> week of Jul 27 - Jul 31 (same month actually)
    // use a date whose Monday falls in the prior month: 2026-09-01 (Tue) -> Mon 2026-08-31
    expect(buildWeekLabel("2026-09-01", "en")).toBe("August 31 - September 4, 2026");
  });

  it("returns null when there is no ex-date", () => {
    expect(buildWeekLabel(null, "en")).toBeNull();
  });
});

describe("buildMonthLabel", () => {
  it("builds a plain month/year label", () => {
    expect(buildMonthLabel("2026-08-19", "en")).toBe("August 2026");
  });
  it("returns null without a date", () => {
    expect(buildMonthLabel(null, "en")).toBeNull();
  });
});

describe("buildOutlookArticle", () => {
  const estimated: ResolvedNextDividend = {
    ticker: "TSLY",
    isOfficial: false,
    amount: 0.5238,
    exDate: "2026-08-19",
    payDate: "2026-08-20",
    declarationDate: "2026-08-18",
    confidence: 0.84,
    previousAmount: 0.51,
    changeFromLastPct: 2.7,
    expectedRange: { low: 0.5099, high: 0.5377 },
    sourceUrl: null,
    comparisonToPrediction: null,
  };

  it("mentions the estimated amount and marks it not-yet-declared", () => {
    const paragraphs = buildOutlookArticle(
      { ticker: "TSLY", etfName: "YieldMax TSLA Option Income Strategy ETF", providerId: "yieldmax", resolved: estimated },
      "en"
    );
    const joined = paragraphs.join(" ");
    expect(joined).toContain("$0.5238");
    expect(joined).toContain("has not yet been officially declared");
    expect(joined).toContain("2026-08-19");
  });

  it("switches to declared-official language once official, and includes the comparison only when both values are real", () => {
    const official: ResolvedNextDividend = {
      ...estimated,
      isOfficial: true,
      amount: 0.5301,
      comparisonToPrediction: { predictedAmount: 0.5238, actualAmount: 0.5301, errorPct: 1.2 },
    };
    const paragraphs = buildOutlookArticle(
      { ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved: official },
      "en"
    );
    const joined = paragraphs.join(" ");
    expect(joined).toContain("officially declared");
    expect(joined).toContain("$0.5301");
    expect(joined).toContain("previously estimated");
    expect(joined).toContain("$0.5238");
    expect(joined).toContain("above");
  });

  it("never fabricates a comparison sentence when none exists", () => {
    const official: ResolvedNextDividend = { ...estimated, isOfficial: true, amount: 0.5301, comparisonToPrediction: null };
    const paragraphs = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved: official }, "en");
    expect(paragraphs.join(" ")).not.toContain("previously estimated");
  });

  describe("public prediction-comparison threshold (MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT)", () => {
    function officialWithComparison(predictedAmount: number, actualAmount: number, errorPct: number | null): ResolvedNextDividend {
      return {
        ...estimated,
        isOfficial: true,
        amount: actualAmount,
        comparisonToPrediction: { predictedAmount, actualAmount, errorPct },
      };
    }

    it(`shows the real comparison sentence when error is exactly at the ${MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT}% boundary`, () => {
      const resolved = officialWithComparison(0.4557, 0.5238, MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT);
      const joined = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved }, "en").join(" ");
      expect(joined).toContain("previously estimated");
      expect(joined).toContain("$0.4557");
      expect(joined).toContain(`${MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT.toFixed(1)}%`);
    });

    it("hides the comparison sentence and predicted amount just above the boundary, showing the neutral sentence instead", () => {
      const resolved = officialWithComparison(0.4556, 0.5238, MAX_PUBLIC_PREDICTION_COMPARISON_ERROR_PCT + 0.1);
      const joined = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved }, "en").join(" ");
      expect(joined).not.toContain("previously estimated");
      expect(joined).not.toContain("$0.4556");
      expect(joined).not.toMatch(/\d+(\.\d+)?%/);
      expect(joined).toContain("has now been announced");
      expect(joined).toContain("updated with the latest declared amount");
    });

    it("hides a large real-world miss like the TSLY 65.3% case behind the neutral sentence", () => {
      const resolved = officialWithComparison(0.2955, 0.1788, 65.27);
      const joined = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved }, "en").join(" ");
      expect(joined).not.toContain("0.2955");
      expect(joined).not.toContain("65.");
      expect(joined).toContain("has now been announced");
    });

    it("shows a small real-world hit like the BIGY 0.02% case, at full sub-1% precision", () => {
      const resolved = officialWithComparison(0.5238, 0.5237, 0.02);
      const joined = buildOutlookArticle({ ticker: "BIGY", etfName: null, providerId: "yieldmax", resolved }, "en").join(" ");
      expect(joined).toContain("$0.5238");
      expect(joined).toContain("0.02%");
      expect(joined).toContain("below");
    });

    it("derives the percentage from the real amounts (never fabricated) when errorPct itself is null, and still applies the threshold", () => {
      // predicted 0.30 -> actual 0.10 is a real 66.7% miss even though the
      // pipeline didn't populate errorPct for this row.
      const resolved = officialWithComparison(0.3, 0.1, null);
      const joined = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved }, "en").join(" ");
      expect(joined).not.toContain("previously estimated");
      expect(joined).toContain("has now been announced");
    });

    it("applies the same threshold behavior in Korean", () => {
      const withinThreshold = officialWithComparison(0.5238, 0.5237, 0.02);
      const overThreshold = officialWithComparison(0.2955, 0.1788, 65.27);
      const joinedOk = buildOutlookArticle({ ticker: "BIGY", etfName: null, providerId: "yieldmax", resolved: withinThreshold }, "ko").join(" ");
      const joinedHidden = buildOutlookArticle({ ticker: "TSLY", etfName: null, providerId: "yieldmax", resolved: overThreshold }, "ko").join(" ");
      expect(joinedOk).toContain("CRADY는 이전에");
      expect(joinedHidden).not.toContain("CRADY는 이전에");
      expect(joinedHidden).toContain("업데이트되었습니다");
    });
  });

  it("degrades to a short honest sentence when there is no amount at all", () => {
    const empty: ResolvedNextDividend = {
      ticker: "NEWX",
      isOfficial: false,
      amount: null,
      exDate: null,
      payDate: null,
      declarationDate: null,
      confidence: null,
      previousAmount: null,
      changeFromLastPct: null,
      expectedRange: null,
      sourceUrl: null,
      comparisonToPrediction: null,
    };
    const paragraphs = buildOutlookArticle({ ticker: "NEWX", etfName: null, providerId: "yieldmax", resolved: empty }, "en");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0]).toContain("doesn't have enough recent data");
  });
});

describe("buildEligibilityNote", () => {
  it("uses the financially-correct 'purchase before ex-dividend date' framing", () => {
    const note = buildEligibilityNote("TSLY", "2026-08-19", "en");
    expect(note).toContain("purchase shares before the ex-dividend date");
    expect(note).not.toMatch(/hold until/i);
    expect(note).not.toMatch(/buy on the ex-dividend date/i);
  });

  it("returns null without an ex-date", () => {
    expect(buildEligibilityNote("TSLY", null, "en")).toBeNull();
  });
});

describe("buildNextDividendSeoFaq", () => {
  const resolvedEstimated: ResolvedNextDividend = {
    ticker: "TSLY",
    isOfficial: false,
    amount: 0.5238,
    exDate: "2026-08-19",
    payDate: "2026-08-20",
    declarationDate: "2026-08-18",
    confidence: 0.84,
    previousAmount: 0.51,
    changeFromLastPct: 2.7,
    expectedRange: { low: 0.5099, high: 0.5377 },
    sourceUrl: null,
    comparisonToPrediction: null,
  };

  it("includes a leading 'When is next dividend' question and a Yes/No declared-status question", () => {
    const items = buildNextDividendSeoFaq(
      {
        ticker: "TSLY",
        exDate: "2026-08-19",
        payDate: "2026-08-20",
        declarationDate: "2026-08-18",
        pointEstimate: 0.5238,
        isOfficial: false,
        officialAmount: null,
      },
      resolvedEstimated,
      "en"
    );
    expect(items[0].question).toBe("When is TSLY's next dividend?");
    expect(items.some((i) => i.question === "Has TSLY's dividend been officially declared?")).toBe(true);
    const declaredItem = items.find((i) => i.question === "Has TSLY's dividend been officially declared?")!;
    expect(declaredItem.answer).toMatch(/^No\./);
  });

  it("answers Yes for the declared-status question once official", () => {
    const items = buildNextDividendSeoFaq(
      {
        ticker: "TSLY",
        exDate: "2026-08-12",
        payDate: "2026-08-13",
        declarationDate: "2026-08-11",
        pointEstimate: null,
        isOfficial: true,
        officialAmount: 0.5301,
      },
      { ...resolvedEstimated, isOfficial: true, amount: 0.5301 },
      "en"
    );
    const declaredItem = items.find((i) => i.question === "Has TSLY's dividend been officially declared?")!;
    expect(declaredItem.answer).toMatch(/^Yes\./);
  });

  it("never fabricates dates/amounts it doesn't have", () => {
    const items = buildNextDividendSeoFaq(
      {
        ticker: "NEWX",
        exDate: null,
        payDate: null,
        declarationDate: null,
        pointEstimate: null,
        isOfficial: false,
        officialAmount: null,
      },
      {
        ticker: "NEWX",
        isOfficial: false,
        amount: null,
        exDate: null,
        payDate: null,
        declarationDate: null,
        confidence: null,
        previousAmount: null,
        changeFromLastPct: null,
        expectedRange: null,
        sourceUrl: null,
        comparisonToPrediction: null,
      },
      "en"
    );
    // No leading summary question (nothing real to answer), just the
    // always-present "why does CRADY expect this / declared status" items.
    expect(items.every((i) => !i.question.startsWith("When is NEWX's next dividend"))).toBe(true);
  });
});
