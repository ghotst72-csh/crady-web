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
    confidenceScore: 0.82,
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
  it("reports no activity honestly when there is none", () => {
    const recap = buildWeeklyRecap(
      {
        ticker: "TSLY",
        priceDeltaPct7d: null,
        distributionsPaid7d: 0,
        totalPaidAmount7d: null,
        newQuestions7d: 0,
        newComments7d: 0,
      },
      "en"
    );
    expect(recap).toMatch(/no new investor discussion/i);
  });

  it("summarizes real weekly numbers", () => {
    const recap = buildWeeklyRecap(
      {
        ticker: "TSLY",
        priceDeltaPct7d: -1.8,
        distributionsPaid7d: 1,
        totalPaidAmount7d: 0.5,
        newQuestions7d: 2,
        newComments7d: 5,
      },
      "en"
    );
    expect(recap).toContain("-1.8%");
    expect(recap).toContain("$0.5000");
    expect(recap).toContain("2 new question");
  });
});
