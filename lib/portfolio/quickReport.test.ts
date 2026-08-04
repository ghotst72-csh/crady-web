import { describe, it, expect } from "vitest";
import { buildQuickReport, type QuickReportInput, type QuickReportHolding } from "./quickReport";

function holding(overrides: Partial<QuickReportHolding> & { ticker: string }): QuickReportHolding {
  return {
    providerId: "yieldmax",
    investmentAmount: 10000,
    totalReturnAmount: 0,
    priceStatus: "current",
    priceStaleDays: null,
    hasSplitWarning: false,
    ...overrides,
  };
}

describe("buildQuickReport", () => {
  it("returns nothing when there's no computable total return", () => {
    const input: QuickReportInput = {
      holdings: [],
      totalInvested: 0,
      totalCurrentValue: 0,
      totalDividendsReceived: 0,
      totalPriceReturnAmount: 0,
      totalReturnAmount: 0,
      totalReturnPct: null,
    };
    expect(buildQuickReport(input, "en")).toEqual([]);
  });

  it("matches the spec's worked example framing: dividends partly offsetting a net loss", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY", investmentAmount: 20000 })],
      totalInvested: 20000,
      totalCurrentValue: 11600,
      totalDividendsReceived: 6100,
      totalPriceReturnAmount: -8400,
      totalReturnAmount: -2300,
      totalReturnPct: -11.5,
    };
    const report = buildQuickReport(input, "en");
    expect(report[0]).toContain("$6,100");
    expect(report[0]).toContain("total loss");
    expect(report[0]).toContain("-$2,300");
    expect(report.some((s) => s.includes("offset"))).toBe(true);
  });

  it("never claims a total loss when the total return is actually positive", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY" })],
      totalInvested: 10000,
      totalCurrentValue: 9000,
      totalDividendsReceived: 1500,
      totalPriceReturnAmount: -1000,
      totalReturnAmount: 500,
      totalReturnPct: 5,
    };
    const report = buildQuickReport(input, "en");
    expect(report[0]).not.toContain("total loss");
    expect(report[0]).toMatch(/\+\$500|total result/);
  });

  it("identifies best and worst contributors only with 2+ holdings", () => {
    const input: QuickReportInput = {
      holdings: [
        holding({ ticker: "WINNER", totalReturnAmount: 5000 }),
        holding({ ticker: "LOSER", totalReturnAmount: -3000 }),
      ],
      totalInvested: 20000,
      totalCurrentValue: 19000,
      totalDividendsReceived: 3000,
      totalPriceReturnAmount: -2000,
      totalReturnAmount: 2000,
      totalReturnPct: 10,
    };
    const report = buildQuickReport(input, "en");
    expect(report.some((s) => s.includes("WINNER") && s.includes("strongest"))).toBe(true);
    expect(report.some((s) => s.includes("LOSER") && s.includes("weakest"))).toBe(true);
  });

  it("omits contributor sentences for a single holding", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "SOLO", totalReturnAmount: 100 })],
      totalInvested: 10000,
      totalCurrentValue: 10100,
      totalDividendsReceived: 0,
      totalPriceReturnAmount: 100,
      totalReturnAmount: 100,
      totalReturnPct: 1,
    };
    const report = buildQuickReport(input, "en");
    expect(report.some((s) => s.includes("strongest") || s.includes("weakest"))).toBe(false);
  });

  it("flags provider concentration only above the threshold", () => {
    const concentrated: QuickReportInput = {
      holdings: [
        holding({ ticker: "A", providerId: "yieldmax", investmentAmount: 8000 }),
        holding({ ticker: "B", providerId: "roundhill", investmentAmount: 2000 }),
      ],
      totalInvested: 10000,
      totalCurrentValue: 10000,
      totalDividendsReceived: 0,
      totalPriceReturnAmount: 0,
      totalReturnAmount: 0,
      totalReturnPct: 0,
    };
    const report = buildQuickReport(concentrated, "en");
    expect(report.some((s) => s.includes("concentration"))).toBe(true);

    const balanced: QuickReportInput = {
      ...concentrated,
      holdings: [
        holding({ ticker: "A", providerId: "yieldmax", investmentAmount: 4000 }),
        holding({ ticker: "B", providerId: "roundhill", investmentAmount: 3000 }),
        holding({ ticker: "C", providerId: "defiance", investmentAmount: 3000 }),
      ],
    };
    expect(buildQuickReport(balanced, "en").some((s) => s.includes("concentration"))).toBe(false);
  });

  it("never issues a buy/sell directive or a guaranteed-outcome claim", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY", priceStatus: "delayed", priceStaleDays: 18, hasSplitWarning: true })],
      totalInvested: 20000,
      totalCurrentValue: 11600,
      totalDividendsReceived: 6100,
      totalPriceReturnAmount: -8400,
      totalReturnAmount: -2300,
      totalReturnPct: -11.5,
      bestAlternative: { forTicker: "TSLY", altTicker: "QDTE", deltaAmount: 4100 },
    };
    const report = buildQuickReport(input, "en");
    const joined = report.join(" ").toLowerCase();
    expect(joined).not.toMatch(/should sell|must sell|guaranteed|will (increase|rise|outperform)/);
    expect(report.some((s) => s.includes("18 days"))).toBe(true);
    expect(report.some((s) => s.includes("split"))).toBe(true);
    expect(report.some((s) => s.includes("QDTE"))).toBe(true);
  });

  it("phrases a favorable and unfavorable alternative distinctly", () => {
    const base: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY" })],
      totalInvested: 10000,
      totalCurrentValue: 10000,
      totalDividendsReceived: 0,
      totalPriceReturnAmount: 0,
      totalReturnAmount: 0,
      totalReturnPct: 0,
    };
    const better = buildQuickReport(
      { ...base, bestAlternative: { forTicker: "TSLY", altTicker: "QDTE", deltaAmount: 1000 } },
      "en"
    );
    const worse = buildQuickReport(
      { ...base, bestAlternative: { forTicker: "TSLY", altTicker: "QDTE", deltaAmount: -1000 } },
      "en"
    );
    expect(better.some((s) => s.includes("higher"))).toBe(true);
    expect(worse.some((s) => s.includes("lower"))).toBe(true);
  });

  it("always ends with the informational-not-advice disclaimer", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY" })],
      totalInvested: 10000,
      totalCurrentValue: 10000,
      totalDividendsReceived: 0,
      totalPriceReturnAmount: 0,
      totalReturnAmount: 0,
      totalReturnPct: 0,
    };
    const report = buildQuickReport(input, "en");
    expect(report[report.length - 1]).toMatch(/informational, not investment advice/);
  });

  it("produces Korean sentences when lang=ko", () => {
    const input: QuickReportInput = {
      holdings: [holding({ ticker: "TSLY" })],
      totalInvested: 20000,
      totalCurrentValue: 11600,
      totalDividendsReceived: 6100,
      totalPriceReturnAmount: -8400,
      totalReturnAmount: -2300,
      totalReturnPct: -11.5,
    };
    const report = buildQuickReport(input, "ko");
    expect(report[0]).toContain("배당금");
    expect(report[report.length - 1]).toContain("투자 조언");
  });
});
