import { describe, it, expect } from "vitest";
import type { EtfSnapshot } from "@/lib/data";
import type { ConfirmedRow } from "./nextDividendBoard";

// nextDividendBoard.ts imports lib/supabase (module-level client creation
// from NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) even though this test only
// exercises the pure resolveBoardEntry/buildNextDividendBoard functions —
// same known pattern as app/api/revalidate/route.test.ts. Set placeholders
// before the runtime (value) import below so module evaluation succeeds.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

const { resolveBoardEntry, buildNextDividendBoard, computeSummaryStats } = await import("./nextDividendBoard");

const TODAY = "2026-08-07";

function snap(overrides: Partial<EtfSnapshot>): EtfSnapshot {
  return {
    ticker: "AAA",
    provider_id: "yieldmax",
    name: "AAA Fund",
    payoutFrequency: "weekly",
    price: 10,
    cradyScore: 50,
    riskLevel: "NORMAL",
    volatility30d: null,
    dividendStabilityScore: null,
    annualYieldPct: null,
    latestDividend: null,
    latestDividendDate: null,
    nextPredictedAmount: null,
    nextPredictedDate: null,
    nextPredictedExDate: null,
    nextPredictedConfidence: null,
    dividendTrend: null,
    dividendTrendPct: null,
    calculatedAt: null,
    ...overrides,
  };
}

function confirmedRow(overrides: Partial<ConfirmedRow>): ConfirmedRow {
  return {
    ticker: "AAA",
    declaration_date: "2026-08-05",
    ex_date: "2026-08-06",
    pay_date: "2026-08-07",
    amount: 0.25,
    ...overrides,
  };
}

describe("resolveBoardEntry — status classification (the real 2026-08-07 production bug)", () => {
  it("real production case: a confirmed distribution paying today is 'paying-today', not 'confirmed'", () => {
    // The exact live shape found on 2026-08-07: declared Aug 5, ex Aug 6,
    // pay Aug 7 — every real Group 2 ticker looked like this the day the
    // bug was reported. This must never come out as a plain "confirmed"
    // badge, which reads as "still ahead."
    const s = snap({ latestDividend: 0.21 });
    const entry = resolveBoardEntry(s, confirmedRow({ pay_date: TODAY }), TODAY);
    expect(entry!.status).toBe("paying-today");
  });

  it("a confirmed distribution with a strictly future pay_date is 'confirmed'", () => {
    const s = snap({});
    const entry = resolveBoardEntry(s, confirmedRow({ pay_date: "2026-08-09" }), TODAY);
    expect(entry!.status).toBe("confirmed");
  });

  it("a confirmed distribution with a past pay_date is 'paid' (defensive — should not normally reach here)", () => {
    const s = snap({});
    const entry = resolveBoardEntry(s, confirmedRow({ pay_date: "2026-08-01" }), TODAY);
    expect(entry!.status).toBe("paid");
  });

  it("no confirmed row: falls back to the CRADY prediction, status 'estimated'", () => {
    const s = snap({
      nextPredictedAmount: 0.3118,
      nextPredictedDate: "2026-08-14",
      nextPredictedExDate: "2026-08-13",
      nextPredictedConfidence: 82.05,
      latestDividend: 0.2296,
    });
    const entry = resolveBoardEntry(s, undefined, TODAY);
    expect(entry).toMatchObject({
      isOfficial: false,
      status: "estimated",
      amount: 0.3118,
      declarationDate: null,
      exDate: "2026-08-13",
      payDate: "2026-08-14",
      confidence: 82.05,
    });
  });

  it("is honestly omitted (null), never fabricated, when a ticker has neither a confirmed row nor a live prediction", () => {
    const s = snap({ nextPredictedAmount: null, nextPredictedDate: null });
    expect(resolveBoardEntry(s, undefined, TODAY)).toBeNull();
  });

  it("computes the change-from-last percentage correctly for a real increase", () => {
    const s = snap({ latestDividend: 0.2 });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.22, pay_date: "2026-08-09" }), TODAY);
    expect(entry!.changeFromLastPct).toBeCloseTo(10, 5);
  });

  it("computes a negative change for a real decrease", () => {
    const s = snap({ latestDividend: 0.3 });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.2296, pay_date: "2026-08-09" }), TODAY);
    expect(entry!.changeFromLastPct).toBeCloseTo(-23.4667, 3);
  });

  it("returns null change when there is no prior payment to compare against", () => {
    const s = snap({ latestDividend: null });
    const entry = resolveBoardEntry(s, confirmedRow({ pay_date: "2026-08-09" }), TODAY);
    expect(entry!.changeFromLastPct).toBeNull();
  });
});

describe("buildNextDividendBoard", () => {
  it("sorts by soonest pay date first, mixing confirmed and estimated tickers", () => {
    const snapshot = [
      snap({ ticker: "LATER", nextPredictedAmount: 0.1, nextPredictedDate: "2026-09-01" }),
      snap({ ticker: "SOON", nextPredictedAmount: 0.2, nextPredictedDate: "2026-08-08" }),
    ];
    const confirmed = new Map<string, ConfirmedRow>([
      ["MID", confirmedRow({ ticker: "MID", pay_date: "2026-08-15", amount: 0.3 })],
    ]);
    const snapshotWithMid = [...snapshot, snap({ ticker: "MID" })];
    const board = buildNextDividendBoard(snapshotWithMid, confirmed, TODAY);
    expect(board.map((e) => e.ticker)).toEqual(["SOON", "MID", "LATER"]);
  });

  it("omits tickers with nothing knowable instead of padding the list", () => {
    const snapshot = [snap({ ticker: "EMPTY" }), snap({ ticker: "SOON", nextPredictedAmount: 0.2, nextPredictedDate: "2026-08-08" })];
    const board = buildNextDividendBoard(snapshot, new Map(), TODAY);
    expect(board.map((e) => e.ticker)).toEqual(["SOON"]);
  });

  it("real production shape: an entire same-day batch all resolve to paying-today, not confirmed", () => {
    const tickers = ["AIYY", "AMDY", "AMZY", "TSLY"];
    const snapshot = tickers.map((t) => snap({ ticker: t }));
    const confirmed = new Map<string, ConfirmedRow>(
      tickers.map((t) => [t, confirmedRow({ ticker: t, pay_date: TODAY })])
    );
    const board = buildNextDividendBoard(snapshot, confirmed, TODAY);
    expect(board.every((e) => e.status === "paying-today")).toBe(true);
    expect(board.some((e) => e.status === "confirmed")).toBe(false);
  });
});

describe("computeSummaryStats", () => {
  it("counts this-week as payDate within the next 7 days from today (inclusive of today)", () => {
    const snapshot = [
      snap({ ticker: "TODAY", nextPredictedAmount: 0.1, nextPredictedDate: TODAY }),
      snap({ ticker: "IN6D", nextPredictedAmount: 0.1, nextPredictedDate: "2026-08-13" }),
      snap({ ticker: "IN7D", nextPredictedAmount: 0.1, nextPredictedDate: "2026-08-14" }), // exactly 7 days out — excluded
      snap({ ticker: "FAR", nextPredictedAmount: 0.1, nextPredictedDate: "2026-09-01" }),
    ];
    const board = buildNextDividendBoard(snapshot, new Map(), TODAY);
    const stats = computeSummaryStats(board, TODAY);
    expect(stats.thisWeekCount).toBe(2);
  });

  it("splits confirmed (paying-today + confirmed) from awaiting (estimated) correctly", () => {
    const snapshot = [
      snap({ ticker: "PAYTODAY" }),
      snap({ ticker: "FUTURE" }),
      snap({ ticker: "EST", nextPredictedAmount: 0.2, nextPredictedDate: "2026-08-20" }),
    ];
    const confirmed = new Map<string, ConfirmedRow>([
      ["PAYTODAY", confirmedRow({ ticker: "PAYTODAY", pay_date: TODAY })],
      ["FUTURE", confirmedRow({ ticker: "FUTURE", pay_date: "2026-08-20" })],
    ]);
    const board = buildNextDividendBoard(snapshot, confirmed, TODAY);
    const stats = computeSummaryStats(board, TODAY);
    expect(stats.confirmedCount).toBe(2);
    expect(stats.awaitingCount).toBe(1);
  });

  it("finds the real highest-amount ticker, not an arbitrary first entry", () => {
    const snapshot = [
      snap({ ticker: "SMALL", nextPredictedAmount: 0.05, nextPredictedDate: "2026-08-09" }),
      snap({ ticker: "BIG", nextPredictedAmount: 0.73, nextPredictedDate: "2026-08-09" }),
      snap({ ticker: "MID", nextPredictedAmount: 0.3, nextPredictedDate: "2026-08-09" }),
    ];
    const board = buildNextDividendBoard(snapshot, new Map(), TODAY);
    const stats = computeSummaryStats(board, TODAY);
    expect(stats.highest).toEqual({ ticker: "BIG", amount: 0.73 });
  });

  it("returns a null highest when there are no entries at all", () => {
    expect(computeSummaryStats([], TODAY).highest).toBeNull();
  });
});
