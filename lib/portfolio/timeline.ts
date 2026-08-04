/** CRADY Engagement & Intelligence Phase 2, Part B §15 — cumulative
 * portfolio timeline. Sampled at the union of real trading days across all
 * holdings (never interpolated/fabricated points) from the earliest
 * purchase date to today.
 *
 * Scope note: implements Price Only / Dividends Included / Initial
 * Investment Baseline — the three series the spec's own framing directly
 * calls for ("when did the price loss grow, when did dividends start
 * offsetting it"). Reinvestment and Selected-Alternative toggle lines are
 * deferred (see the deployment report) — both are computable with the
 * same date-sampling approach but require materially more per-date
 * compounding/alternative-fetch work than the time budget for this pass
 * allowed; shipping three correct, tested series beat five rushed ones. */

export type TimelineHoldingInput = {
  ticker: string;
  purchaseDate: string;
  investmentAmount: number;
  shares: number;
  /** Ascending by trade_date. */
  history: { trade_date: string; close_price: number | null }[];
  /** Only real, ex-date-eligible distributions (already filtered by the
   * caller via computeEligibleDividends). */
  eligibleDividends: { exDate: string; totalReceived: number }[];
};

export type TimelinePoint = {
  date: string;
  priceOnlyValue: number;
  dividendsIncludedValue: number;
  baseline: number;
};

export type DividendEventMarker = {
  date: string;
  ticker: string;
  amount: number;
};

export type PortfolioTimeline = {
  points: TimelinePoint[];
  events: DividendEventMarker[];
};

function latestCloseAtOrBefore(history: { trade_date: string; close_price: number | null }[], date: string): number | null {
  let match: number | null = null;
  for (const h of history) {
    if (h.trade_date > date) break;
    if (h.close_price != null) match = h.close_price;
  }
  return match;
}

export function buildPortfolioTimeline(holdings: TimelineHoldingInput[], todayIso: string): PortfolioTimeline | null {
  const withData = holdings.filter((h) => h.history.some((p) => p.close_price != null));
  if (withData.length === 0) return null;

  const dateSet = new Set<string>();
  for (const h of withData) {
    for (const p of h.history) {
      if (p.close_price != null && p.trade_date >= h.purchaseDate && p.trade_date <= todayIso) dateSet.add(p.trade_date);
    }
  }
  const dates = [...dateSet].sort();
  if (dates.length === 0) return null;

  const points: TimelinePoint[] = dates.map((date) => {
    let priceOnlyValue = 0;
    let dividendsCumulative = 0;
    let baseline = 0;
    for (const h of withData) {
      if (h.purchaseDate > date) continue;
      baseline += h.investmentAmount;
      const price = latestCloseAtOrBefore(h.history, date);
      if (price != null) priceOnlyValue += h.shares * price;
      for (const d of h.eligibleDividends) {
        if (d.exDate <= date) dividendsCumulative += d.totalReceived;
      }
    }
    return { date, priceOnlyValue, dividendsIncludedValue: priceOnlyValue + dividendsCumulative, baseline };
  });

  const events: DividendEventMarker[] = withData
    .flatMap((h) => h.eligibleDividends.map((d) => ({ date: d.exDate, ticker: h.ticker, amount: d.totalReceived })))
    .filter((e) => e.date <= todayIso)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return { points, events };
}
