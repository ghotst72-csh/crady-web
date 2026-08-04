import { describe, it, expect } from "vitest";
import { buildContributors } from "./contributors";

describe("buildContributors", () => {
  it("sorts descending by net contribution", () => {
    const c = buildContributors([
      { ticker: "LOSER", priceReturnAmount: -5000, totalDividendsReceived: 1000, totalReturnAmount: -4000 },
      { ticker: "WINNER", priceReturnAmount: 2000, totalDividendsReceived: 500, totalReturnAmount: 2500 },
    ]);
    expect(c[0].ticker).toBe("WINNER");
    expect(c[1].ticker).toBe("LOSER");
  });

  it("keeps price and dividend contributions separate, matching the analysis totals exactly", () => {
    const c = buildContributors([{ ticker: "TSLY", priceReturnAmount: -8240, totalDividendsReceived: 2410, totalReturnAmount: -5830 }]);
    expect(c[0].priceContribution).toBe(-8240);
    expect(c[0].dividendContribution).toBe(2410);
    expect(c[0].netContribution).toBe(-5830);
  });

  it("excludes a holding with no computable return instead of showing a fabricated $0", () => {
    const c = buildContributors([
      { ticker: "MDTE", priceReturnAmount: null, totalDividendsReceived: 0, totalReturnAmount: null },
      { ticker: "TSLY", priceReturnAmount: 100, totalDividendsReceived: 50, totalReturnAmount: 150 },
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].ticker).toBe("TSLY");
  });
});
