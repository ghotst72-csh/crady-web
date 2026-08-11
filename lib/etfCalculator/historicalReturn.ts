"use server";

import { getEtf, getPriceHistory, getDistributions } from "@/lib/data";
import { computeHistoricalReturn, type HistoricalReturnResult } from "./historicalReturnCalc";

// Full history / full distribution record — same generous caps the
// Portfolio Analyzer already uses (lib/portfolio/analyze.ts), so a
// long-held ETF's holding period is never silently truncated.
const PRICE_ROWS = 3650;
const DISTRIBUTION_ROWS = 900;

export type HistoricalReturnResponse =
  | (HistoricalReturnResult & { ok: true; ticker: string; name: string | null })
  | (HistoricalReturnResult & { ok: false; ticker: string; name: string | null });

export async function calculateHistoricalReturn(
  rawTicker: string,
  purchaseDateIso: string,
  saleDateIso: string,
  investmentAmount: number
): Promise<HistoricalReturnResponse> {
  const ticker = rawTicker.trim().toUpperCase();
  const [etf, history, distributions] = await Promise.all([
    getEtf(ticker),
    getPriceHistory(ticker, PRICE_ROWS),
    getDistributions(ticker, DISTRIBUTION_ROWS),
  ]);

  const result = computeHistoricalReturn(history, distributions, purchaseDateIso, saleDateIso, investmentAmount);
  return { ...result, ticker, name: etf?.name ?? null } as HistoricalReturnResponse;
}
