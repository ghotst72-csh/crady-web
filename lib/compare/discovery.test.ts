import { describe, it, expect } from "vitest";
import { selectNeighbors } from "./discovery";
import type { CompareEntry } from "./types";
import type { OkCompareEntry } from "./discovery";

function ok(ticker: string, totalReturnPct: number): OkCompareEntry {
  return {
    ok: true,
    ticker,
    startDateResolved: "2025-01-02",
    endDateResolved: "2025-12-31",
    startDateAdjusted: false,
    endDateAdjusted: false,
    totalReturnPct,
    annualizedReturnPct: totalReturnPct,
    priceReturnPct: totalReturnPct,
    totalDistributionsReceived: 0,
    maxDrawdownPct: -10,
    holdingDays: 365,
    snapshot: null,
  };
}

function insufficient(ticker: string): CompareEntry {
  return { ok: false, ticker, reason: "insufficient-history", snapshot: null };
}

// Ranked (descending): A(50) B(40) C(30) D(20)benchmark E(10) F(0) G(-10)
const UNIVERSE: CompareEntry[] = [
  ok("A", 50),
  ok("B", 40),
  ok("C", 30),
  ok("D", 20),
  ok("E", 10),
  ok("F", 0),
  ok("G", -10),
  insufficient("H"),
  insufficient("I"),
];

describe("selectNeighbors", () => {
  it("benchmark in the middle — returns neighborCount on each side, best-first", () => {
    const r = selectNeighbors(UNIVERSE, "D", 2);
    expect(r.benchmark?.ticker).toBe("D");
    expect(r.higher.map((e) => e.ticker)).toEqual(["B", "C"]);
    expect(r.lower.map((e) => e.ticker)).toEqual(["E", "F"]);
    expect(r.rank).toBe(4);
    expect(r.totalRanked).toBe(7);
    expect(r.insufficientHistoryCount).toBe(2);
  });

  it("benchmark at the very top — higher group is empty, not an error", () => {
    const r = selectNeighbors(UNIVERSE, "A", 5);
    expect(r.benchmark?.ticker).toBe("A");
    expect(r.higher).toEqual([]);
    expect(r.lower.map((e) => e.ticker)).toEqual(["B", "C", "D", "E", "F"]);
    expect(r.rank).toBe(1);
  });

  it("benchmark at the very bottom — lower group is empty, not an error", () => {
    const r = selectNeighbors(UNIVERSE, "G", 5);
    expect(r.benchmark?.ticker).toBe("G");
    expect(r.lower).toEqual([]);
    expect(r.higher.map((e) => e.ticker)).toEqual(["B", "C", "D", "E", "F"]);
    expect(r.rank).toBe(7);
  });

  it("requesting more neighbors than exist clamps gracefully, no out-of-bounds", () => {
    const r = selectNeighbors(UNIVERSE, "D", 100);
    expect(r.higher.map((e) => e.ticker)).toEqual(["A", "B", "C"]);
    expect(r.lower.map((e) => e.ticker)).toEqual(["E", "F", "G"]);
  });

  it("benchmark itself has insufficient history — returns benchmark:null cleanly, not a crash", () => {
    const r = selectNeighbors(UNIVERSE, "H", 3);
    expect(r.benchmark).toBeNull();
    expect(r.higher).toEqual([]);
    expect(r.lower).toEqual([]);
    expect(r.rank).toBeNull();
    expect(r.insufficientHistoryCount).toBe(2);
  });

  it("benchmark ticker not present in the universe at all — same clean null handling", () => {
    const r = selectNeighbors(UNIVERSE, "ZZZZ", 3);
    expect(r.benchmark).toBeNull();
    expect(r.rank).toBeNull();
  });
});
