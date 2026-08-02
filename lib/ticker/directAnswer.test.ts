import { describe, it, expect } from "vitest";
import { buildDirectAnswer, type DirectAnswerInput } from "./directAnswer";

const BASE: DirectAnswerInput = {
  ticker: "TSLY",
  providerId: "yieldmax",
  payoutFrequency: "weekly",
  annualYieldPct: 76.3,
  prediction: null,
  latestPaidDistribution: null,
};

describe("buildDirectAnswer", () => {
  it("prioritizes a real next-dividend prediction", () => {
    const answer = buildDirectAnswer(
      { ...BASE, prediction: { targetPayDate: "2026-08-07", predictedAmount: 0.32 } },
      "en"
    );
    expect(answer).toContain("TSLY");
    expect(answer).toMatch(/next dividend is expected/i);
    expect(answer).toContain("August 2026");
    expect(answer).toMatch(/historical payment patterns/i);
  });

  it("falls back to the last real payment when there's no prediction", () => {
    const answer = buildDirectAnswer(
      { ...BASE, latestPaidDistribution: { amount: 0.2147, payDate: "2026-07-31" } },
      "en"
    );
    expect(answer).toContain("$0.2147");
    expect(answer).toContain("2026-07-31");
    expect(answer).toMatch(/not enough data yet/i);
  });

  it("falls back to an identity/yield fact when there's no dividend history at all", () => {
    const answer = buildDirectAnswer(BASE, "en");
    expect(answer).toContain("TSLY");
    expect(answer).toMatch(/weekly dividend ETF/i);
    expect(answer).toContain("76.3%");
  });

  it("never fabricates a forecast date when prediction is null", () => {
    const answer = buildDirectAnswer(BASE, "en");
    expect(answer).not.toMatch(/next dividend is expected/i);
  });

  it("produces a Korean sentence for the prediction case", () => {
    const answer = buildDirectAnswer(
      { ...BASE, prediction: { targetPayDate: "2026-08-07", predictedAmount: 0.32 } },
      "ko"
    );
    expect(answer).toContain("TSLY");
    expect(answer).toMatch(/다음 배당/);
  });

  it("stays within a reasonable one-sentence length", () => {
    const answer = buildDirectAnswer(
      { ...BASE, prediction: { targetPayDate: "2026-08-07", predictedAmount: 0.32 } },
      "en"
    );
    expect(answer.length).toBeLessThan(200);
    expect(answer.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
  });
});
