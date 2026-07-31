import { describe, it, expect } from "vitest";
import {
  sortDistributionRows,
  searchDistributionRows,
  filterDistributionRows,
  buildAvailableFilters,
  type DistributionRow,
} from "./table";

function row(overrides: Partial<DistributionRow>): DistributionRow {
  return {
    ticker: "TEST",
    etfName: "Test ETF",
    providerId: "yieldmax",
    frequency: "Weekly",
    distributionPerShare: 0.1,
    distributionRate: 50,
    secYield30d: 3,
    rocPercent: 90,
    exDate: "2026-07-30",
    payDate: "2026-07-31",
    sourceUrl: "https://example.com",
    ...overrides,
  };
}

// A small, representative fixture — mirrors the real July 29 Group 2
// announcement's shape without depending on live data (three real tickers,
// but not the ONLY tickers the logic supports).
const ROWS: DistributionRow[] = [
  row({ ticker: "MSTY", distributionPerShare: 0.2222, distributionRate: 90.51, rocPercent: 95, payDate: "2026-07-31" }),
  row({ ticker: "TSLY", distributionPerShare: 0.2147, distributionRate: 53.04, rocPercent: 60, payDate: "2026-07-31" }),
  row({ ticker: "CONY", distributionPerShare: 0.2942, distributionRate: 75.03, rocPercent: null, payDate: "2026-06-24", frequency: "Monthly", providerId: "roundhill" }),
  row({ ticker: "NVDY", distributionPerShare: null, distributionRate: null, rocPercent: 10, payDate: "2026-08-05" }),
];

describe("sortDistributionRows", () => {
  it("sorts ticker A-Z", () => {
    expect(sortDistributionRows(ROWS, "ticker-asc").map((r) => r.ticker)).toEqual([
      "CONY", "MSTY", "NVDY", "TSLY",
    ]);
  });

  it("sorts by highest distribution per share, nulls last", () => {
    const sorted = sortDistributionRows(ROWS, "amount-desc").map((r) => r.ticker);
    expect(sorted).toEqual(["CONY", "MSTY", "TSLY", "NVDY"]);
  });

  it("sorts by highest distribution rate, nulls last", () => {
    expect(sortDistributionRows(ROWS, "rate-desc").map((r) => r.ticker)).toEqual([
      "MSTY", "CONY", "TSLY", "NVDY",
    ]);
  });

  it("sorts by highest ROC, nulls last", () => {
    expect(sortDistributionRows(ROWS, "roc-desc").map((r) => r.ticker)).toEqual([
      "MSTY", "TSLY", "NVDY", "CONY",
    ]);
  });

  it("sorts by lowest ROC, nulls last (not first)", () => {
    const sorted = sortDistributionRows(ROWS, "roc-asc").map((r) => r.ticker);
    expect(sorted[sorted.length - 1]).toBe("CONY"); // null ROC still sorts last, even ascending
    expect(sorted[0]).toBe("NVDY"); // lowest real ROC (10)
  });

  it("sorts by latest payment date", () => {
    expect(sortDistributionRows(ROWS, "pay-date-desc").map((r) => r.ticker)).toEqual([
      "NVDY", "MSTY", "TSLY", "CONY",
    ]);
  });

  it("does not mutate the input array", () => {
    const original = [...ROWS];
    sortDistributionRows(ROWS, "ticker-asc");
    expect(ROWS).toEqual(original);
  });
});

describe("searchDistributionRows", () => {
  it("matches by ticker, case-insensitively", () => {
    expect(searchDistributionRows(ROWS, "msty").map((r) => r.ticker)).toEqual(["MSTY"]);
  });

  it("matches by ETF name substring", () => {
    expect(searchDistributionRows(ROWS, "test etf").length).toBe(4); // all fixture rows share this name
  });

  it("returns everything for an empty query", () => {
    expect(searchDistributionRows(ROWS, "").length).toBe(4);
    expect(searchDistributionRows(ROWS, "   ").length).toBe(4);
  });

  it("returns nothing for a query matching no row", () => {
    expect(searchDistributionRows(ROWS, "zzznotreal")).toEqual([]);
  });

  it("is not restricted to a hard-coded ticker allowlist — any real ticker in the data is searchable", () => {
    const extra = [...ROWS, row({ ticker: "ZZZZ" })];
    expect(searchDistributionRows(extra, "zzzz").map((r) => r.ticker)).toEqual(["ZZZZ"]);
  });
});

describe("filterDistributionRows", () => {
  it("'all' returns everything", () => {
    expect(filterDistributionRows(ROWS, "all").length).toBe(4);
  });

  it("filters by frequency", () => {
    expect(filterDistributionRows(ROWS, "freq:Monthly").map((r) => r.ticker)).toEqual(["CONY"]);
  });

  it("filters by provider", () => {
    expect(filterDistributionRows(ROWS, "provider:roundhill").map((r) => r.ticker)).toEqual(["CONY"]);
  });

  it("returns everything for an unrecognized filter value", () => {
    expect(filterDistributionRows(ROWS, "provider:doesnotexist")).toEqual([]);
    expect(filterDistributionRows(ROWS, "garbage")).toEqual(ROWS);
  });
});

describe("buildAvailableFilters", () => {
  it("derives filter chips from the actual data, not a fixed list", () => {
    const filters = buildAvailableFilters(ROWS);
    const values = filters.map((f) => f.value);
    expect(values).toContain("all");
    expect(values).toContain("freq:Weekly");
    expect(values).toContain("freq:Monthly");
    expect(values).toContain("provider:yieldmax");
    expect(values).toContain("provider:roundhill");
    // Not present in the fixture — must not appear.
    expect(values).not.toContain("provider:defiance");
  });

  it("counts are accurate", () => {
    const filters = buildAvailableFilters(ROWS);
    const weekly = filters.find((f) => f.value === "freq:Weekly");
    expect(weekly?.count).toBe(3);
  });
});
