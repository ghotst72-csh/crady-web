import { describe, it, expect } from "vitest";
import { searchTickers, splitForHighlight, type SearchEntry } from "./searchTickers";

// A small, representative fixture — real shapes, not fabricated tickers
// beyond what a real search index would contain (see Part F of the CRADY
// International SEO spec: every displayed result must map to a real page).
const INDEX: SearchEntry[] = [
  { ticker: "MSTY", name: "YieldMax MSTR Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 90.2, cradyScore: 55.1 },
  { ticker: "MARO", name: "Roundhill MicroStrategy WeeklyPay ETF", provider_id: "roundhill", annualYieldPct: 40.1, cradyScore: 48.0 },
  { ticker: "MRNY", name: "YieldMax MRNA Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 60.5, cradyScore: 30.2 },
  { ticker: "TSLY", name: "YieldMax TSLA Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 84.4, cradyScore: 34.7 },
  { ticker: "TSMY", name: "YieldMax TSM Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 65.1, cradyScore: 54.8 },
  { ticker: "ULTY", name: "YieldMax Ultra Option Income Strategy ETF", provider_id: "yieldmax", annualYieldPct: 75.9, cradyScore: 48.5 },
  { ticker: "QDTE", name: "Roundhill Innovation-100 0DTE Covered Call Strategy ETF", provider_id: "roundhill", annualYieldPct: 30.1, cradyScore: 60.0 },
  { ticker: "MSFO", name: "Defiance Daily Target 2X Long MSFT ETF", provider_id: "defiance", annualYieldPct: 20.5, cradyScore: 42.0 },
  // Name deliberately does NOT start with or contain "Defiance" — the only
  // way "defiance" can match this entry is via the issuer fallback, which
  // is exactly what the issuer-match tests below need to isolate.
  { ticker: "XOMO", name: "ExxonMobil Option Income Strategy ETF", provider_id: "defiance", annualYieldPct: 25.1, cradyScore: 45.0 },
];

describe("searchTickers", () => {
  it("returns [] for an empty query", () => {
    expect(searchTickers(INDEX, "", 8)).toEqual([]);
    expect(searchTickers(INDEX, "   ", 8)).toEqual([]);
  });

  it("finds an exact ticker match", () => {
    const results = searchTickers(INDEX, "MSTY", 8);
    expect(results[0].ticker).toBe("MSTY");
    expect(results[0].matchType).toBe("ticker-exact");
  });

  it("is case-insensitive", () => {
    const results = searchTickers(INDEX, "msty", 8);
    expect(results[0].ticker).toBe("MSTY");
    expect(results[0].matchType).toBe("ticker-exact");
  });

  it("trims surrounding whitespace", () => {
    const results = searchTickers(INDEX, "  msty  ", 8);
    expect(results[0].ticker).toBe("MSTY");
  });

  it("matches a ticker prefix and ranks prefix matches together", () => {
    // "m" should surface MSTY, MARO, MRNY, MSFO (all start with M) ahead of
    // anything that only contains "m" elsewhere.
    const results = searchTickers(INDEX, "m", 8);
    const tickers = results.map((r) => r.ticker);
    expect(tickers).toEqual(expect.arrayContaining(["MSTY", "MARO", "MRNY", "MSFO"]));
    for (const r of results.filter((r) => ["MSTY", "MARO", "MRNY", "MSFO"].includes(r.ticker))) {
      expect(r.matchType).toBe("ticker-prefix");
    }
  });

  it("narrows correctly for a two-letter prefix", () => {
    const results = searchTickers(INDEX, "ts", 8);
    const tickers = results.map((r) => r.ticker);
    expect(tickers).toEqual(["TSLY", "TSMY"]);
  });

  it("finds a ticker substring match when no prefix matches", () => {
    // No ticker in the fixture starts with "lty", but ULTY contains it.
    const results = searchTickers(INDEX, "lty", 8);
    expect(results[0].ticker).toBe("ULTY");
    expect(results[0].matchType).toBe("ticker-substring");
  });

  it("matches by ETF name when the query isn't a ticker substring", () => {
    const results = searchTickers(INDEX, "microstrategy", 8);
    expect(results.some((r) => r.ticker === "MARO")).toBe(true);
    expect(results.find((r) => r.ticker === "MARO")!.matchType).toBe("name-substring");
  });

  it("matches by issuer name when the query isn't in the ticker or name", () => {
    const results = searchTickers(INDEX, "defiance", 8);
    expect(results.map((r) => r.ticker)).toContain("XOMO");
    expect(results.find((r) => r.ticker === "XOMO")!.matchType).toBe("issuer");
  });

  it("ranks a name-prefix match ahead of an issuer-only match for the same query", () => {
    // MSFO's name literally starts with "Defiance" (name-prefix, rank 3);
    // XOMO only matches via its issuer (issuer, rank 5) — MSFO must sort
    // first even though both are real, valid "defiance" matches.
    const results = searchTickers(INDEX, "defiance", 8);
    const msfoIndex = results.findIndex((r) => r.ticker === "MSFO");
    const xomoIndex = results.findIndex((r) => r.ticker === "XOMO");
    expect(msfoIndex).toBeGreaterThanOrEqual(0);
    expect(xomoIndex).toBeGreaterThanOrEqual(0);
    expect(msfoIndex).toBeLessThan(xomoIndex);
    expect(results[msfoIndex].matchType).toBe("name-prefix");
    expect(results[xomoIndex].matchType).toBe("issuer");
  });

  it("returns no results for a query that matches nothing", () => {
    expect(searchTickers(INDEX, "zzzznotreal", 8)).toEqual([]);
  });

  it("excludes tickers/names/issuers that don't match at all", () => {
    const results = searchTickers(INDEX, "tsly", 8);
    expect(results.map((r) => r.ticker)).toEqual(["TSLY"]);
  });

  it("respects the limit parameter", () => {
    const results = searchTickers(INDEX, "y", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

describe("splitForHighlight", () => {
  it("splits around a matched substring case-insensitively", () => {
    const { before, match, after } = splitForHighlight("MSTY", "st");
    expect(before).toBe("M");
    expect(match).toBe("ST");
    expect(after).toBe("Y");
  });

  it("returns the whole text as `before` when there's no match", () => {
    const { before, match, after } = splitForHighlight("MSTY", "zzz");
    expect(before).toBe("MSTY");
    expect(match).toBe("");
    expect(after).toBe("");
  });

  it("returns the whole text as `before` for an empty query", () => {
    const { before, match, after } = splitForHighlight("MSTY", "");
    expect(before).toBe("MSTY");
    expect(match).toBe("");
    expect(after).toBe("");
  });
});
