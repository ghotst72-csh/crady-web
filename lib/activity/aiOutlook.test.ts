import { describe, it, expect } from "vitest";
import { buildAiOutlook, buildActivityConfidence, buildWeeklyRecap, type AiOutlookInput } from "./aiOutlook";

const ZERO_SIGNALS = { questionCount: 0, totalComments: 0, voteCount: 0 };

const EMPTY_INPUT: AiOutlookInput = {
  ticker: "TSLY",
  providerId: "yieldmax",
  priceDeltaPct: null,
  riskLevel: null,
  cradyScore: null,
  maxDrawdownPct: null,
  volatility30dPct: null,
  annualYieldPct: null,
  dividendTrendPct: null,
  latestPaidDistribution: null,
  prediction: null,
  mostDiscussed: null,
  activitySignals: ZERO_SIGNALS,
};

const POPULATED_INPUT: AiOutlookInput = {
  ticker: "TSLY",
  providerId: "yieldmax",
  priceDeltaPct: 2.4,
  riskLevel: "RISKY",
  cradyScore: 62.3,
  maxDrawdownPct: -18.5,
  volatility30dPct: 4.2,
  annualYieldPct: 65.1,
  dividendTrendPct: -3.2,
  latestPaidDistribution: { amount: 0.5, payDate: "2026-07-25" },
  prediction: {
    targetPayDate: "2026-08-08",
    targetExDate: "2026-08-06",
    predictedAmount: 0.48,
    // Real-world confidenceScore values flowing through the app come from
    // next_predictions.confidence_score, which is stored 0-100 (not 0-1)
    // — confirmed by direct query. Using a 0-1 fixture here previously
    // masked the double-scaling bug (see the dedicated regression test
    // below) because the old buggy code's extra *100 only broke on real,
    // already-0-100 input.
    confidenceScore: 82,
    predictionMethod: "weighted_average",
  },
  mostDiscussed: { title: "Will TSLY reduce its dividend?", replyCount: 12 },
  activitySignals: { questionCount: 3, totalComments: 14, voteCount: 9 },
};

describe("buildAiOutlook", () => {
  it("every subsection has a non-empty 'not enough data' fallback when nothing is known (en)", () => {
    const outlook = buildAiOutlook(EMPTY_INPUT, "en");
    for (const value of Object.values(outlook)) {
      expect(value.length).toBeGreaterThan(0);
    }
    expect(outlook.whatInvestorsAreWatching).toMatch(/no investor discussion yet/i);
    expect(outlook.dividendConfidence).toMatch(/no confident/i);
  });

  it("every subsection has a non-empty fallback (ko)", () => {
    const outlook = buildAiOutlook(EMPTY_INPUT, "ko");
    for (const value of Object.values(outlook)) {
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("uses real data when populated (en)", () => {
    const outlook = buildAiOutlook(POPULATED_INPUT, "en");
    expect(outlook.todaysOutlook).toMatch(/up \+?2\.4%/);
    expect(outlook.dividendConfidence).toMatch(/\$0\.4800/);
    expect(outlook.dividendConfidence).toMatch(/82%/);
    expect(outlook.whatInvestorsAreWatching).toContain("Will TSLY reduce its dividend?");
    expect(outlook.upcomingCatalyst).toContain("2026-08-06");
  });

  it("regression: never renders an impossible confidence like the reported 8378% bug", () => {
    // The exact real-world shape that produced the bug report: a
    // next_predictions.confidence_score of 83.78 (already 0-100).
    const outlook = buildAiOutlook(
      { ...POPULATED_INPUT, prediction: { ...POPULATED_INPUT.prediction!, confidenceScore: 83.78 } },
      "en"
    );
    expect(outlook.dividendConfidence).toMatch(/84%/);
    expect(outlook.dividendConfidence).not.toContain("8378%");

    const outlookKo = buildAiOutlook(
      { ...POPULATED_INPUT, prediction: { ...POPULATED_INPUT.prediction!, confidenceScore: 83.78 } },
      "ko"
    );
    expect(outlookKo.dividendConfidence).not.toContain("8378%");
  });

  it("stays within a reasonable overall word budget (~150 words across all subsections)", () => {
    const outlook = buildAiOutlook(POPULATED_INPUT, "en");
    const totalWords = Object.values(outlook).join(" ").split(/\s+/).filter(Boolean).length;
    expect(totalWords).toBeLessThanOrEqual(150);
  });

  it("never fabricates a bull case without real yield data", () => {
    const outlook = buildAiOutlook(EMPTY_INPUT, "en");
    expect(outlook.bullCase).toMatch(/not enough/i);
  });
});

describe("buildActivityConfidence", () => {
  it("reports 'low' with zero real signals — never a fabricated percentage", () => {
    const confidence = buildActivityConfidence(ZERO_SIGNALS, "en");
    expect(confidence.level).toBe("low");
  });

  it("escalates with real signal volume", () => {
    expect(buildActivityConfidence({ questionCount: 1, totalComments: 1, voteCount: 1 }, "en").level).toBe(
      "building"
    );
    expect(buildActivityConfidence({ questionCount: 3, totalComments: 5, voteCount: 2 }, "en").level).toBe(
      "moderate"
    );
    expect(buildActivityConfidence({ questionCount: 10, totalComments: 15, voteCount: 10 }, "en").level).toBe(
      "established"
    );
  });
});

describe("buildWeeklyRecap", () => {
  const EMPTY_WEEK = {
    ticker: "TSLY",
    priceDeltaPct7d: null,
    distributionsPaid7d: 0,
    totalPaidAmount7d: null,
    newQuestions7d: 0,
    newComments7d: 0,
    forecastChangeHeadlines: [],
    upcomingDate: null,
  };

  it("reports each section's no-activity state honestly when there is none, never fabricating filler", () => {
    const recap = buildWeeklyRecap(EMPTY_WEEK, "en");
    expect(recap.investorActivity).toMatch(/no new investor discussion/i);
    expect(recap.distributionActivity).toMatch(/no distributions were paid/i);
    expect(recap.forecastChange).toBe("No major distribution or forecast changes were recorded this week.");
    expect(recap.priceMovement).toBeNull();
    expect(recap.whatToWatch).toBeNull();
  });

  it("summarizes real weekly numbers per section", () => {
    const recap = buildWeeklyRecap(
      {
        ...EMPTY_WEEK,
        priceDeltaPct7d: -1.8,
        distributionsPaid7d: 1,
        totalPaidAmount7d: 0.5,
        newQuestions7d: 2,
        newComments7d: 5,
        forecastChangeHeadlines: ["CRADY's next-dividend prediction for TSLY changed from $0.42 to $0.45 per share."],
        upcomingDate: { label: "next ex-dividend date", date: "2026-08-15" },
      },
      "en"
    );
    expect(recap.oneSentence).toContain("-1.8%");
    expect(recap.priceMovement).toContain("-1.8%");
    expect(recap.distributionActivity).toContain("$0.5000");
    expect(recap.investorActivity).toContain("2 new question");
    expect(recap.forecastChange).toContain("$0.45");
    expect(recap.whatToWatch).toContain("2026-08-15");
  });

  it("renders Korean copy", () => {
    const recap = buildWeeklyRecap(EMPTY_WEEK, "ko");
    expect(recap.investorActivity).toBe("이번 주 새로운 투자자 논의는 없었습니다.");
    expect(recap.distributionActivity).toBe("이번 주 지급된 배당은 없었습니다.");
  });
});
