/** ETF Detail Page v3 — Investor Dashboard Redesign.
 *
 * All figures here are derived purely from real, already-fetched daily
 * closes (etf_price_history has one row per *trading day* — there is no
 * intraday feed). That's a real constraint on requirement #2 ("1D / 1W / 1M
 * / 3M" sparkline tabs): a literal "1D" window is a single point and can't
 * draw a trend line, and fabricating intraday movement would violate the
 * site's never-fabricate-data rule. The honest substitute used here is a
 * 1W / 1M / 3M window set (all real multi-point trading-day slices), with
 * 1W as the shortest, always-available default — "today's change" itself is
 * still shown as an exact number (todayChangePct), just not as a sparkline.
 */

export type PriceHistoryPoint = { trade_date: string; close_price: number | null };

export type PriceWindowId = "1W" | "1M" | "3M";

export type PriceWindowStat = {
  changePct: number | null;
  /** Close-price slice for this window, oldest first — feed directly into
   * components/ui/Sparkline.tsx's `values` prop. */
  sparkline: number[];
};

export type PriceSummary = {
  currentPrice: number | null;
  asOfDate: string | null;
  /** Latest close vs. the prior trading day's close. */
  todayChangePct: number | null;
  rangeHigh: number | null;
  rangeLow: number | null;
  /** "52W" once at least ~200 trading days of history exist (roughly a
   * year); otherwise "SINCE_INCEPTION" so a young ETF never gets labeled
   * with a range it doesn't actually have a year of data for. */
  rangeLabel: "52W" | "SINCE_INCEPTION" | null;
  rangeTradingDays: number;
  windows: Record<PriceWindowId, PriceWindowStat>;
};

const WINDOW_TRADING_DAYS: Record<PriceWindowId, number> = {
  "1W": 5,
  "1M": 21,
  "3M": 63,
};

const FULL_YEAR_TRADING_DAYS = 200;

function pctChange(from: number, to: number): number | null {
  if (from === 0) return null;
  return ((to - from) / from) * 100;
}

function buildWindow(closes: number[], tradingDays: number): PriceWindowStat {
  const slice = closes.slice(-tradingDays);
  if (slice.length < 2) return { changePct: null, sparkline: [] };
  return {
    changePct: pctChange(slice[0], slice[slice.length - 1]),
    sparkline: slice,
  };
}

/** `history` must be ascending by trade_date (oldest first) — the shape
 * lib/data.ts's getPriceHistory() already returns. */
export function buildPriceSummary(history: PriceHistoryPoint[]): PriceSummary {
  const points = history.filter(
    (h): h is { trade_date: string; close_price: number } => h.close_price != null
  );
  const closes = points.map((p) => p.close_price);

  const currentPrice = closes.length > 0 ? closes[closes.length - 1] : null;
  const asOfDate = points.length > 0 ? points[points.length - 1].trade_date : null;
  const todayChangePct =
    closes.length >= 2 ? pctChange(closes[closes.length - 2], closes[closes.length - 1]) : null;

  const rangeHigh = closes.length > 0 ? Math.max(...closes) : null;
  const rangeLow = closes.length > 0 ? Math.min(...closes) : null;
  const rangeLabel =
    closes.length >= FULL_YEAR_TRADING_DAYS ? "52W" : closes.length >= 2 ? "SINCE_INCEPTION" : null;

  return {
    currentPrice,
    asOfDate,
    todayChangePct,
    rangeHigh,
    rangeLow,
    rangeLabel,
    rangeTradingDays: closes.length,
    windows: {
      "1W": buildWindow(closes, WINDOW_TRADING_DAYS["1W"]),
      "1M": buildWindow(closes, WINDOW_TRADING_DAYS["1M"]),
      "3M": buildWindow(closes, WINDOW_TRADING_DAYS["3M"]),
    },
  };
}

export type DividendPriceComparison = {
  priceChangePct: number | null;
  dividendChangePct: number | null;
};

/** "Price vs Dividend, Last 30 Days" (requirement #4) — a genuine
 * apples-to-apples 30-day-window comparison, not a payment-over-payment
 * delta: price change is close-30-days-ago vs. today; dividend change is
 * the sum of distributions actually paid in the last 30 days vs. the sum
 * paid in the 30 days before that. Either side returns null (never a
 * fabricated 0% or divide-by-zero) when there isn't enough real data in
 * that window — e.g. a monthly payer may have zero payments in one of the
 * two 30-day buckets. */
export function buildDividendPriceComparison(
  history: PriceHistoryPoint[],
  distributions: { pay_date: string; amount: number | null }[],
  todayIso: string = new Date().toISOString().slice(0, 10)
): DividendPriceComparison {
  const today = new Date(todayIso + "T00:00:00Z");
  const cutoff30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const points = history.filter((h) => h.close_price != null);
  const currentPrice = points.length > 0 ? points[points.length - 1].close_price : null;
  const priceRef = [...points].reverse().find((p) => p.trade_date <= cutoff30);
  const priceChangePct =
    currentPrice != null && priceRef?.close_price != null
      ? pctChange(priceRef.close_price, currentPrice)
      : null;

  const cutoff60 = new Date(today.getTime() - 60 * 86400000).toISOString().slice(0, 10);
  const last30Sum = distributions
    .filter((d) => d.pay_date > cutoff30 && d.pay_date <= todayIso && d.amount != null)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const prior30Sum = distributions
    .filter((d) => d.pay_date > cutoff60 && d.pay_date <= cutoff30 && d.amount != null)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const dividendChangePct = last30Sum > 0 && prior30Sum > 0 ? pctChange(prior30Sum, last30Sum) : null;

  return { priceChangePct, dividendChangePct };
}
