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

  // Regression guard for a reporting mix-up caught during Activity Engine
  // Phase 2 live verification (the code and the live HTML were both
  // already correct — MDTE genuinely rendered "What's your outlook on
  // MDTE?" — but the final report's summary table was mistranscribed as
  // "TSLY 전망은?" for the MDTE row). This test makes that specific class
  // of error mechanically impossible to miss in the future: every sample
  // ticker, run through every selectable question branch, must produce
  // text containing its OWN ticker and none of the others'.
  const SAMPLE_TICKERS = ["TSLY", "MSTY", "CONY", "QDTE", "MDTE"];
  const SIGNAL_VARIANTS: { name: string; input: Omit<DiscussionQuestionInput, "ticker"> }[] = [
    { name: "dividend_trend_down", input: { annualYieldPct: null, riskLevel: null, dividendTrendPct: -8, payoutFrequency: null, nextPredictedExDate: null } },
    { name: "high_yield_high_risk", input: { annualYieldPct: 90, riskLevel: "RISKY", dividendTrendPct: null, payoutFrequency: null, nextPredictedExDate: null } },
    { name: "upcoming_ex_date", input: { annualYieldPct: null, riskLevel: null, dividendTrendPct: null, payoutFrequency: null, nextPredictedExDate: "2026-08-15" } },
    { name: "weekly_frequency", input: { annualYieldPct: null, riskLevel: null, dividendTrendPct: null, payoutFrequency: "weekly", nextPredictedExDate: null } },
    { name: "generic (low-data fallback)", input: { annualYieldPct: null, riskLevel: null, dividendTrendPct: null, payoutFrequency: null, nextPredictedExDate: null } },
  ];

  for (const ticker of SAMPLE_TICKERS) {
    for (const variant of SIGNAL_VARIANTS) {
      for (const lang of ["en", "ko"] as const) {
        it(`${ticker} / ${variant.name} / ${lang}: question mentions only ${ticker}, never another sample ticker`, () => {
          const q = buildDiscussionQuestion({ ticker, ...variant.input }, lang);
          expect(q.text).toContain(ticker);
          for (const other of SAMPLE_TICKERS) {
            if (other === ticker) continue;
            expect(q.text).not.toContain(other);
          }
        });
      }
    }
  }
});
