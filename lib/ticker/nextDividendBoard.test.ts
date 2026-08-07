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

const { resolveBoardEntry, buildNextDividendBoard } = await import("./nextDividendBoard");

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

describe("resolveBoardEntry", () => {
  it("prefers a real confirmed distribution over the prediction and marks it official", () => {
    const s = snap({ nextPredictedAmount: 0.3, nextPredictedDate: "2026-08-07", latestDividend: 0.21 });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.25 }));
    expect(entry).toMatchObject({
      isOfficial: true,
      amount: 0.25,
      declarationDate: "2026-08-05",
      exDate: "2026-08-06",
      payDate: "2026-08-07",
      confidence: null,
    });
  });

  it("falls back to the CRADY prediction, marked estimated, when nothing is confirmed yet", () => {
    const s = snap({
      nextPredictedAmount: 0.3118,
      nextPredictedDate: "2026-08-14",
      nextPredictedExDate: "2026-08-13",
      nextPredictedConfidence: 82.05,
      latestDividend: 0.2296,
    });
    const entry = resolveBoardEntry(s, undefined);
    expect(entry).toMatchObject({
      isOfficial: false,
      amount: 0.3118,
      declarationDate: null,
      exDate: "2026-08-13",
      payDate: "2026-08-14",
      confidence: 82.05,
    });
  });

  it("is honestly omitted (null), never fabricated, when a ticker has neither a confirmed row nor a live prediction", () => {
    const s = snap({ nextPredictedAmount: null, nextPredictedDate: null });
    expect(resolveBoardEntry(s, undefined)).toBeNull();
  });

  it("computes the change-from-last percentage correctly for a real increase", () => {
    const s = snap({ latestDividend: 0.2 });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.22 }));
    expect(entry!.changeFromLastPct).toBeCloseTo(10, 5);
  });

  it("computes a negative change for a real decrease", () => {
    const s = snap({ latestDividend: 0.3 });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.2296 }));
    expect(entry!.changeFromLastPct).toBeCloseTo(-23.4667, 3);
  });

  it("returns null change when there is no prior payment to compare against", () => {
    const s = snap({ latestDividend: null });
    const entry = resolveBoardEntry(s, confirmedRow({ amount: 0.25 }));
    expect(entry!.changeFromLastPct).toBeNull();
  });
});

describe("buildNextDividendBoard", () => {
  it("sorts by soonest pay date first, mixing confirmed and estimated tickers", () => {
    const snapshot = [
      snap({ ticker: "LATER", nextPredictedAmount: 0.1, nextPredictedDate: "2026-09-01" }),
      snap({ ticker: "SOON", nextPredictedAmount: 0.2, nextPredictedDate: "2026-08-01" }),
    ];
    const confirmed = new Map<string, ConfirmedRow>([
      ["MID", confirmedRow({ ticker: "MID", pay_date: "2026-08-15", amount: 0.3 })],
    ]);
    const snapshotWithMid = [...snapshot, snap({ ticker: "MID" })];
    const board = buildNextDividendBoard(snapshotWithMid, confirmed);
    expect(board.map((e) => e.ticker)).toEqual(["SOON", "MID", "LATER"]);
  });

  it("omits tickers with nothing knowable instead of padding the list", () => {
    const snapshot = [snap({ ticker: "EMPTY" }), snap({ ticker: "SOON", nextPredictedAmount: 0.2, nextPredictedDate: "2026-08-01" })];
    const board = buildNextDividendBoard(snapshot, new Map());
    expect(board.map((e) => e.ticker)).toEqual(["SOON"]);
  });
});
