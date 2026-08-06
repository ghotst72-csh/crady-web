import { describe, it, expect } from "vitest";
import {
  buildWhyThisEstimate,
  buildNextDividendDirectAnswer,
  buildNextDividendFaq,
  buildEstimateFactors,
  buildWhatWouldChangeThis,
} from "./nextDividendNarrative";

describe("buildWhyThisEstimate", () => {
  it("names the real underlying ticker for a single-stock covered-call fund", () => {
    const text = buildWhyThisEstimate(
      {
        ticker: "TSLY",
        etfType: "single-stock-covered-call",
        underlyingTicker: "TSLA",
        underlyingMovementPct: null,
        hasVolatilityData: true,
        volatilityPct: 65.4,
        recentAmountsCount: 8,
        payoutFrequency: "weekly",
        pointEstimate: 0.3077,
      },
      "en"
    );
    expect(text).toContain("TSLY");
    expect(text).toContain("TSLA");
    expect(text).toContain("$0.3077");
    expect(text).toContain("not yet been officially declared");
  });

  it("honestly notes missing underlying price data instead of fabricating a movement number", () => {
    const text = buildWhyThisEstimate(
      {
        ticker: "TSLY",
        etfType: "single-stock-covered-call",
        underlyingTicker: "TSLA",
        underlyingMovementPct: null,
        hasVolatilityData: false,
        volatilityPct: null,
        recentAmountsCount: 8,
        payoutFrequency: "weekly",
        pointEstimate: 0.3,
      },
      "en"
    );
    expect(text).toMatch(/not currently available/i);
    expect(text).toMatch(/implied-volatility data is unavailable/i);
  });

  it("produces a genuinely different sentence for an index covered-call fund vs. a single-stock one", () => {
    const single = buildWhyThisEstimate(
      { ticker: "TSLY", etfType: "single-stock-covered-call", underlyingTicker: "TSLA", underlyingMovementPct: null, hasVolatilityData: true, volatilityPct: 50, recentAmountsCount: 5, payoutFrequency: "weekly", pointEstimate: 0.3 },
      "en"
    );
    const index = buildWhyThisEstimate(
      { ticker: "QDTE", etfType: "index-covered-call", underlyingTicker: null, underlyingMovementPct: null, hasVolatilityData: true, volatilityPct: 20, recentAmountsCount: 5, payoutFrequency: "weekly", pointEstimate: 0.1 },
      "en"
    );
    expect(single).not.toBe(index);
    expect(single).toContain("TSLA");
    expect(index).toContain("index");
  });

  it("produces Korean text distinct from the English version", () => {
    const en = buildWhyThisEstimate(
      { ticker: "TSLY", etfType: "single-stock-covered-call", underlyingTicker: "TSLA", underlyingMovementPct: null, hasVolatilityData: true, volatilityPct: 50, recentAmountsCount: 5, payoutFrequency: "weekly", pointEstimate: 0.3077 },
      "en"
    );
    const ko = buildWhyThisEstimate(
      { ticker: "TSLY", etfType: "single-stock-covered-call", underlyingTicker: "TSLA", underlyingMovementPct: null, hasVolatilityData: true, volatilityPct: 50, recentAmountsCount: 5, payoutFrequency: "weekly", pointEstimate: 0.3077 },
      "ko"
    );
    expect(en).not.toBe(ko);
    expect(ko).toContain("아직 운용사가 공식적으로 선언한 금액은 아닙니다");
  });

  it("never claims a rising estimate is a positive investment signal", () => {
    const text = buildWhyThisEstimate(
      { ticker: "TSLY", etfType: "single-stock-covered-call", underlyingTicker: "TSLA", underlyingMovementPct: 30, hasVolatilityData: true, volatilityPct: 60, recentAmountsCount: 5, payoutFrequency: "weekly", pointEstimate: 0.4 },
      "en"
    );
    expect(text.toLowerCase()).not.toMatch(/buy|great opportunity|strong signal|bullish/);
  });
});

describe("buildNextDividendDirectAnswer", () => {
  it("produces the estimated-state sentence with all the real inputs", () => {
    const s = buildNextDividendDirectAnswer(
      { ticker: "TSLY", exDate: "2026-08-07", pointEstimate: 0.3077, isOfficial: false, officialAmount: null, payDate: "2026-08-08" },
      "en"
    );
    expect(s).toContain("TSLY");
    expect(s).toContain("2026-08-07");
    expect(s).toContain("$0.3077");
  });

  it("produces the official-state sentence once a real amount is declared", () => {
    const s = buildNextDividendDirectAnswer(
      { ticker: "TSLY", exDate: "2026-08-07", pointEstimate: null, isOfficial: true, officialAmount: 0.3012, payDate: "2026-08-08" },
      "en"
    );
    expect(s).toContain("officially declared");
    expect(s).toContain("$0.3012");
    expect(s).not.toMatch(/estimate/i);
  });

  it("returns null when there's nothing real to say", () => {
    expect(buildNextDividendDirectAnswer({ ticker: "MDTE", exDate: null, pointEstimate: null, isOfficial: false, officialAmount: null, payDate: null }, "en")).toBeNull();
  });
});

describe("buildNextDividendFaq", () => {
  it("includes the core required questions when data is available", () => {
    const items = buildNextDividendFaq(
      { ticker: "TSLY", exDate: "2026-08-07", payDate: "2026-08-08", declarationDate: "2026-08-05", pointEstimate: 0.3077, isOfficial: false, officialAmount: null },
      "en"
    );
    const questions = items.map((i) => i.question);
    expect(questions.some((q) => q.includes("ex-dividend date"))).toBe(true);
    expect(questions.some((q) => q.includes("declare"))).toBe(true);
    expect(questions.some((q) => q.includes("expected to pay"))).toBe(true);
    expect(questions.some((q) => q.includes("Why does CRADY"))).toBe(true);
    expect(questions.some((q) => q.includes("official or estimated"))).toBe(true);
    expect(questions.some((q) => q.includes("payment date"))).toBe(true);
  });

  it("omits the declaration-date question when there's no real declaration date", () => {
    const items = buildNextDividendFaq(
      { ticker: "MDTE", exDate: null, payDate: null, declarationDate: null, pointEstimate: null, isOfficial: false, officialAmount: null },
      "en"
    );
    expect(items.some((i) => i.question.includes("declare"))).toBe(false);
  });
});

describe("buildEstimateFactors", () => {
  it("puts sufficient real history and low underlying volatility in positive", () => {
    const factors = buildEstimateFactors(
      {
        recentAmountsCount: 8,
        isOfficiallyDeclared: false,
        underlyingVolatility30d: 23.5,
        hasUnderlyingTicker: true,
        underlyingTicker: "AAPL",
      },
      "en"
    );
    expect(factors.positive.some((f) => f.includes("pattern"))).toBe(true);
    expect(factors.positive.some((f) => f.includes("AAPL"))).toBe(true);
    expect(factors.negative).toHaveLength(0);
  });

  it("puts high underlying volatility in negative, real number included", () => {
    const factors = buildEstimateFactors(
      {
        recentAmountsCount: 8,
        isOfficiallyDeclared: false,
        underlyingVolatility30d: 65.7,
        hasUnderlyingTicker: true,
        underlyingTicker: "TSLA",
      },
      "en"
    );
    expect(factors.negative.some((f) => f.includes("65.7%"))).toBe(true);
  });

  it("puts missing underlying volatility data in unknown, never fabricated", () => {
    const factors = buildEstimateFactors(
      { recentAmountsCount: 0, isOfficiallyDeclared: false, underlyingVolatility30d: null, hasUnderlyingTicker: true, underlyingTicker: "COIN" },
      "en"
    );
    expect(factors.unknown.some((f) => f.includes("COIN"))).toBe(true);
    expect(factors.negative.some((f) => f.includes("history"))).toBe(true);
  });

  it("marks an official declaration as a positive reliability factor", () => {
    const factors = buildEstimateFactors(
      { recentAmountsCount: 5, isOfficiallyDeclared: true, underlyingVolatility30d: null, hasUnderlyingTicker: false, underlyingTicker: null },
      "en"
    );
    expect(factors.positive.some((f) => /officially declared/.test(f))).toBe(true);
  });
});

describe("buildWhatWouldChangeThis", () => {
  it("mentions official declaration only when not yet declared", () => {
    const notDeclared = buildWhatWouldChangeThis({ isOfficiallyDeclared: false, hasUnderlyingTicker: false, underlyingTicker: null }, "en");
    expect(notDeclared.some((s) => /official declaration/.test(s))).toBe(true);

    const declared = buildWhatWouldChangeThis({ isOfficiallyDeclared: true, hasUnderlyingTicker: false, underlyingTicker: null }, "en");
    expect(declared.some((s) => /official declaration/.test(s))).toBe(false);
  });

  it("mentions the real underlying ticker when one exists", () => {
    const items = buildWhatWouldChangeThis({ isOfficiallyDeclared: false, hasUnderlyingTicker: true, underlyingTicker: "MSTR" }, "en");
    expect(items.some((s) => s.includes("MSTR"))).toBe(true);
  });
});
