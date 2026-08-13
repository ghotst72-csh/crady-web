"use server";

import { supabase } from "@/lib/supabase";
import { getHomeSnapshot, type EtfSnapshot } from "@/lib/data";
import { getPriceHistoryForTickersInRange, getDistributionsForTickersInRange } from "./data";
import { computePeriodReturn } from "./calculations";
import { resolveComparePeriod, type ComparePeriodInput } from "./period";
import type { CompareEntry } from "./types";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Single combined action for one "Compare ETFs" submit — computes Total
 * Return (etc.) for the ENTIRE tracked universe (~72 tickers) exactly
 * once, over the exact same resolved period, via one paginated batched
 * price/distribution fetch (see lib/compare/data.ts) rather than one
 * query per ticker. The 2-5 user-selected tickers are then just a filter
 * over that same universe — not a second, separate fetch — since the
 * discovery scan already needed every tracked ticker's data anyway. This
 * is also what makes the discovery section "free" once the user submits:
 * no second round trip, no second scan when the benchmark dropdown
 * changes (that's pure client-side re-slicing, see lib/compare/discovery.ts). */
export type SubmitComparisonResult =
  | { ok: true; startDate: string; endDate: string; universe: CompareEntry[]; selectedTickers: string[] }
  | { ok: false; error: "invalid-tickers" | "invalid-period" };

export async function submitComparison(
  tickers: string[],
  periodInput: ComparePeriodInput
): Promise<SubmitComparisonResult> {
  const uniqueTickers = [...new Set(tickers.map((t) => t.trim().toUpperCase()))].filter(Boolean);
  if (uniqueTickers.length < 2 || uniqueTickers.length > 5) {
    return { ok: false, error: "invalid-tickers" };
  }

  const period = resolveComparePeriod(periodInput, todayIso());
  if (!period) return { ok: false, error: "invalid-period" };

  const snapshot = await getHomeSnapshot();
  const snapshotByTicker = new Map<string, EtfSnapshot>(snapshot.map((s) => [s.ticker, s]));

  // Union with the selected tickers as a safety net — the autocomplete
  // only ever offers tracked tickers, so this is normally a no-op, but a
  // selected ticker must never be silently dropped from its own
  // comparison if it somehow isn't in getHomeSnapshot()'s list.
  const tickersToFetch = [...new Set([...snapshotByTicker.keys(), ...uniqueTickers])];

  const [priceByTicker, distByTicker] = await Promise.all([
    getPriceHistoryForTickersInRange(tickersToFetch, period.startDate, period.endDate),
    getDistributionsForTickersInRange(tickersToFetch, period.startDate, period.endDate),
  ]);

  const universe: CompareEntry[] = tickersToFetch.map((ticker) => {
    const history = priceByTicker.get(ticker) ?? [];
    const distributions = distByTicker.get(ticker) ?? [];
    const result = computePeriodReturn(ticker, history, distributions, period.startDate, period.endDate);
    return { ...result, snapshot: snapshotByTicker.get(ticker) ?? null };
  });

  return { ok: true, startDate: period.startDate, endDate: period.endDate, universe, selectedTickers: uniqueTickers };
}

/** Deliberately lean — one indexed single-row query, not the full price
 * history — used only to proactively tell the user how much common
 * history their current ETF selection actually has, before they submit.
 * Purely advisory: it never changes what compareEtfs/submitComparison
 * actually computes, and never shortens a requested period on its own —
 * see CommonHistoryNotice.tsx, which only ever offers an explicit
 * "Use Xy" action the user has to click. */
export async function getEarliestAvailableDate(rawTicker: string): Promise<string | null> {
  const ticker = rawTicker.trim().toUpperCase();
  const { data, error } = await supabase
    .from("etf_price_history")
    .select("trade_date")
    .eq("ticker", ticker)
    .not("close_price", "is", null)
    .order("trade_date", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0]?.trade_date ?? null;
}
