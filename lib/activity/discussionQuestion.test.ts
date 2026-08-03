import { describe, it, expect } from "vitest";
import { buildDiscussionQuestion, type DiscussionQuestionInput } from "./discussionQuestion";

const BASE: DiscussionQuestionInput = {
  ticker: "TSLY",
  annualYieldPct: null,
  riskLevel: null,
  dividendTrendPct: null,
  payoutFrequency: null,
  nextPredictedExDate: null,
};

describe("buildDiscussionQuestion", () => {
  it("picks the dividend-trend question when the trend is genuinely declining", () => {
    const q = buildDiscussionQuestion({ ...BASE, dividendTrendPct: -8 }, "en");
    expect(q.reason).toBe("dividend_trend_down");
    expect(q.text).toContain("TSLY");
  });

  it("picks the yield-vs-risk question only when both signals are real and meaningful", () => {
    const q = buildDiscussionQuestion({ ...BASE, annualYieldPct: 90, riskLevel: "RISKY" }, "en");
    expect(q.reason).toBe("high_yield_high_risk");
  });

  it("does not pick the yield-vs-risk question when risk is low even if yield is high", () => {
    const q = buildDiscussionQuestion({ ...BASE, annualYieldPct: 90, riskLevel: "SAFE" }, "en");
    expect(q.reason).not.toBe("high_yield_high_risk");
  });

  it("picks the ex-date question when a real prediction date exists", () => {
    const q = buildDiscussionQuestion({ ...BASE, nextPredictedExDate: "2026-08-15" }, "en");
    expect(q.reason).toBe("upcoming_ex_date");
  });

  it("picks the weekly-frequency question for weekly payers with no stronger signal", () => {
    const q = buildDiscussionQuestion({ ...BASE, payoutFrequency: "weekly" }, "en");
    expect(q.reason).toBe("weekly_frequency");
  });

  it("falls back to a generic question when no specific signal is present", () => {
    const q = buildDiscussionQuestion(BASE, "en");
    expect(q.reason).toBe("generic");
  });

  it("different ETFs with different real data get different questions, not one repeated sentence", () => {
    const q1 = buildDiscussionQuestion({ ...BASE, ticker: "TSLY", dividendTrendPct: -10 }, "en");
    const q2 = buildDiscussionQuestion({ ...BASE, ticker: "QDTE", payoutFrequency: "weekly" }, "en");
    expect(q1.text).not.toBe(q2.text);
  });

  it("renders Korean copy", () => {
    const q = buildDiscussionQuestion({ ...BASE, dividendTrendPct: -8 }, "ko");
    expect(q.text).toContain("TSLY");
    expect(q.text).toContain("배당");
  });
});
