import { supabase } from "@/lib/supabase";
import type { PriceHistoryRow, DistributionRow } from "@/lib/data";
import { fetchAllPaginated } from "./pagination";

/** Absorbs weekend/holiday gaps before the requested start date so
 * resolvePurchasePrice's "nearest trading day at or before" always has a
 * real candidate to snap to, even if the exact requested date falls on a
 * non-trading day right at the start of the fetched window. */
const START_BUFFER_DAYS = 10;

function bufferedFromDate(fromDate: string): string {
  const d = new Date(`${fromDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - START_BUFFER_DAYS);
  return d.toISOString().slice(0, 10);
}

function groupBy<T extends { ticker: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    if (!map.has(row.ticker)) map.set(row.ticker, []);
    map.get(row.ticker)!.push(row);
  }
  return map;
}

/** One batched, paginated fetch for every ticker being compared (2-5 for
 * the main comparison, or the full tracked universe for the discovery
 * scan) instead of one query per ticker — the N+1 pattern this feature
 * explicitly must avoid. Rows come back ticker-then-date ordered so each
 * group is already in the ascending order computeHistoricalReturn expects. */
export async function getPriceHistoryForTickersInRange(
  tickers: string[],
  fromDate: string,
  toDate: string
): Promise<Map<string, PriceHistoryRow[]>> {
  if (tickers.length === 0) return new Map();
  const rows = await fetchAllPaginated<PriceHistoryRow>((from, to) =>
    supabase
      .from("etf_price_history")
      .select("ticker, trade_date, close_price")
      .in("ticker", tickers)
      .gte("trade_date", bufferedFromDate(fromDate))
      .lte("trade_date", toDate)
      .order("ticker", { ascending: true })
      .order("trade_date", { ascending: true })
      .range(from, to)
  );
  return groupBy(rows);
}

/** Same batching strategy for distributions. No start buffer needed here —
 * eligibility (computeEligibleDividends, inside computeHistoricalReturn)
 * already only counts ex_date >= the *resolved* purchase date, so a
 * distribution just before the buffer window couldn't be eligible anyway. */
export async function getDistributionsForTickersInRange(
  tickers: string[],
  fromDate: string,
  toDate: string
): Promise<Map<string, DistributionRow[]>> {
  if (tickers.length === 0) return new Map();
  const rows = await fetchAllPaginated<DistributionRow>((from, to) =>
    supabase
      .from("distributions")
      .select("ticker, ex_date, pay_date, declaration_date, amount")
      .in("ticker", tickers)
      .not("amount", "is", null)
      .gte("ex_date", fromDate)
      .lte("ex_date", toDate)
      .order("ticker", { ascending: true })
      .order("ex_date", { ascending: true })
      .range(from, to)
  );
  return groupBy(rows);
}
