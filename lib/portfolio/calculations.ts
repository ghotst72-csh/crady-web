/** CRADY Portfolio Analyzer Phase 1 — pure calculation engine.
 *
 * Every function here is pure (no I/O, no dates from `new Date()` unless
 * explicitly passed in) so the whole engine can be independently
 * recomputed and checked against the UI's output — see
 * lib/portfolio/calculations.test.ts and the live-verification script used
 * for this feature's deployment report. */

export type PriceHistoryPoint = { trade_date: string; close_price: number | null };
export type DistributionPoint = { ex_date: string; pay_date: string; amount: number | null };

// ── Trading-day price resolution ──────────────────────────────────────────

export type ResolvedPrice = {
  effectiveDate: string;
  effectivePrice: number;
  isEstimatedPrice: boolean;
  dateAdjusted: boolean;
};

/** Finds the price to use for a purchase on `requestedDate`. If the user
 * supplied their own price, it's used as-is at the requested date (no
 * trading-day snapping needed — they're telling us what they actually
 * paid). If not, the nearest trading day *at or before* the requested date
 * is used (never a future date — you can't buy at a price that hasn't
 * happened yet), and the result is flagged as both estimated and, if the
 * requested date itself wasn't a trading day, date-adjusted. Returns null
 * if there's no trading day at/before the requested date at all (the ETF
 * wasn't listed yet). `history` must be sorted ascending by trade_date. */
export function resolvePurchasePrice(
  history: PriceHistoryPoint[],
  requestedDate: string,
  userPrice: number | null
): ResolvedPrice | null {
  if (userPrice != null) {
    return {
      effectiveDate: requestedDate,
      effectivePrice: userPrice,
      isEstimatedPrice: false,
      dateAdjusted: false,
    };
  }
  const points = history.filter(
    (h): h is { trade_date: string; close_price: number } => h.close_price != null
  );
  let match: { trade_date: string; close_price: number } | null = null;
  for (const p of points) {
    if (p.trade_date > requestedDate) break;
    match = p;
  }
  if (!match) return null;
  return {
    effectiveDate: match.trade_date,
    effectivePrice: match.close_price,
    isEstimatedPrice: true,
    dateAdjusted: match.trade_date !== requestedDate,
  };
}

/** The most recent trading day at/before `asOfDate` — used for "current
 * value" pricing, same snapping logic as the purchase-side resolver. */
export function latestPriceAtOrBefore(
  history: PriceHistoryPoint[],
  asOfDate: string
): { trade_date: string; close_price: number } | null {
  const points = history.filter(
    (h): h is { trade_date: string; close_price: number } => h.close_price != null
  );
  let match: { trade_date: string; close_price: number } | null = null;
  for (const p of points) {
    if (p.trade_date > asOfDate) break;
    match = p;
  }
  return match;
}

// ── Shares / investment resolution ────────────────────────────────────────

/** Resolves the pair (shares, investmentAmount) from whichever one the
 * user actually provided, using the resolved effective price. Exactly one
 * of `shares`/`investmentAmount` must be non-null going in. */
export function resolveSharesAndAmount(
  shares: number | null,
  investmentAmount: number | null,
  effectivePrice: number
): { shares: number; investmentAmount: number } {
  if (shares != null) {
    return { shares, investmentAmount: shares * effectivePrice };
  }
  if (investmentAmount != null) {
    return { shares: investmentAmount / effectivePrice, investmentAmount };
  }
  throw new Error("resolveSharesAndAmount: one of shares/investmentAmount is required");
}

// ── Dividend eligibility ──────────────────────────────────────────────────

/** Only real, actually-paid distributions (amount != null) with an
 * ex-dividend date on or after the purchase date are eligible — buying
 * *after* a fund has already gone ex-dividend does not entitle you to that
 * payment. Never includes forecast/prediction rows (callers must not pass
 * next_predictions data in here). Sorted ascending by ex-date. */
export function computeEligibleDividends(
  distributions: DistributionPoint[],
  purchaseDate: string,
  shares: number
): { exDate: string; payDate: string; amountPerShare: number; totalReceived: number }[] {
  return distributions
    .filter((d): d is { ex_date: string; pay_date: string; amount: number } => d.amount != null)
    .filter((d) => d.ex_date >= purchaseDate)
    .sort((a, b) => (a.ex_date < b.ex_date ? -1 : a.ex_date > b.ex_date ? 1 : 0))
    .map((d) => ({
      exDate: d.ex_date,
      payDate: d.pay_date,
      amountPerShare: d.amount,
      totalReceived: d.amount * shares,
    }));
}

// ── Returns ────────────────────────────────────────────────────────────────

export function computePriceReturn(
  investmentAmount: number,
  currentValue: number
): { amount: number; pct: number | null } {
  const amount = currentValue - investmentAmount;
  const pct = investmentAmount > 0 ? (amount / investmentAmount) * 100 : null;
  return { amount, pct };
}

/** Total return = current value + all dividends received since purchase -
 * initial investment. This is the single most important number in the
 * tool — see the ETF Detail Page v3 precedent for why price and dividend
 * components must always be shown separately alongside it, never just the
 * combined total (a high yield alone can mask a real loss). */
export function computeTotalReturn(
  investmentAmount: number,
  currentValue: number,
  totalDividendsReceived: number
): { amount: number; pct: number | null } {
  const amount = currentValue + totalDividendsReceived - investmentAmount;
  const pct = investmentAmount > 0 ? (amount / investmentAmount) * 100 : null;
  return { amount, pct };
}

/** CAGR-style annualized return from a total-return percentage over an
 * exact holding period. Returns null for holds under 1 day (annualizing a
 * same-day number is not meaningful) rather than an absurd extrapolation. */
export function computeAnnualizedReturnPct(
  totalReturnPct: number,
  holdingDays: number
): number | null {
  if (holdingDays < 1) return null;
  const years = holdingDays / 365.25;
  const base = 1 + totalReturnPct / 100;
  if (base < 0) return null; // not reachable given currentValue/dividends >= 0, kept as a defensive guard
  return (Math.pow(base, 1 / years) - 1) * 100;
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z").getTime();
  const to = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86400000);
}

// ── Drawdown ────────────────────────────────────────────────────────────────

/** Max peak-to-trough decline (%, always <= 0) within the given close-price
 * sequence. Computed fresh over the exact holding-period window — the
 * sitewide `etf_risk_metrics.max_drawdown_1y` is a fixed trailing window,
 * not aligned to an arbitrary user purchase date, so it can't be reused
 * here. */
export function computeMaxDrawdownPct(closes: number[]): number | null {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let maxDrawdown = 0;
  for (const price of closes) {
    if (price > peak) peak = price;
    if (peak > 0) {
      const dd = ((price - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }
  }
  return maxDrawdown;
}

// ── Data freshness ─────────────────────────────────────────────────────────

/** >5 calendar days stale (covers a normal weekend + one holiday) is
 * flagged "delayed" rather than "current" — chosen to avoid false-flagging
 * every Monday morning while still catching genuinely stuck pipelines
 * (e.g. the real ~18-day-stale JEPY case found during the Hero redesign
 * verification). */
const DELAYED_THRESHOLD_DAYS = 5;

export function computePriceStatus(
  asOfDate: string | null,
  todayIso: string
): { status: "current" | "delayed" | "unavailable"; staleDays: number | null } {
  if (!asOfDate) return { status: "unavailable", staleDays: null };
  const staleDays = daysBetween(asOfDate, todayIso);
  return { status: staleDays > DELAYED_THRESHOLD_DAYS ? "delayed" : "current", staleDays };
}

// ── Split / reverse-split anomaly detection ────────────────────────────────

/** The pipeline has no split-ratio data to auto-adjust historical prices,
 * so a real (unrecorded) split would silently distort every return number
 * computed across it. Rather than pretend precision we don't have, flag
 * any single trading-day close-to-close ratio outside [0.4, 2.5] — far
 * beyond even this product category's normal daily volatility — as a
 * possible split, so the UI can show a warning instead of a confident
 * number. Does not attempt to auto-correct the math. */
const SPLIT_RATIO_LOW = 0.4;
const SPLIT_RATIO_HIGH = 2.5;

// ── Dividend reinvestment simulation ───────────────────────────────────────

export type ReinvestmentResult = {
  finalShares: number;
  totalDividendsReinvested: number;
};

/** Walks eligible dividends in ex-date order and compounds: each payout is
 * used to buy additional (fractional) shares at that ex-date's closing
 * price, so the *next* dividend is paid on a larger share count. This is
 * a genuinely different calculation from computeEligibleDividends (which
 * assumes a fixed share count throughout) — reinvestment must be
 * simulated step-by-step, not derived from the final totals. A dividend
 * with no available price at/before its ex-date can't be reinvested (no
 * price to buy at) and is skipped from compounding, though still counted
 * in totalDividendsReinvested. */
export function simulateReinvestment(
  history: PriceHistoryPoint[],
  distributions: DistributionPoint[],
  purchaseDate: string,
  initialShares: number
): ReinvestmentResult {
  const eligible = distributions
    .filter((d): d is { ex_date: string; pay_date: string; amount: number } => d.amount != null)
    .filter((d) => d.ex_date >= purchaseDate)
    .sort((a, b) => (a.ex_date < b.ex_date ? -1 : a.ex_date > b.ex_date ? 1 : 0));

  let shares = initialShares;
  let totalDividendsReinvested = 0;

  for (const d of eligible) {
    const dividendCash = d.amount * shares;
    totalDividendsReinvested += dividendCash;
    const priceAtExDate = latestPriceAtOrBefore(history, d.ex_date)?.close_price;
    if (priceAtExDate == null || priceAtExDate <= 0) continue;
    shares += dividendCash / priceAtExDate;
  }

  return { finalShares: shares, totalDividendsReinvested };
}

// ── Alternative-ETF comparison ─────────────────────────────────────────────

export type AlternativeReturnResult = {
  currentValue: number;
  dividendsReceived: number;
  totalReturnPct: number | null;
  maxDrawdownPct: number | null;
};

/** "Same date, same dollar amount" comparison (§8) — deliberately NOT the
 * same share count as the real holding, since the point is "what would
 * this many *dollars* have bought elsewhere," not "what would this many
 * *shares* of a totally different, differently-priced ETF have cost."
 * Returns null when the alternative has no price at/before the purchase
 * date (not listed yet) or no current price at all. */
export function computeAlternativeReturn(
  altHistory: PriceHistoryPoint[],
  altDistributions: DistributionPoint[],
  purchaseDate: string,
  investmentAmount: number,
  todayIso: string
): AlternativeReturnResult | null {
  const purchase = resolvePurchasePrice(altHistory, purchaseDate, null);
  if (!purchase) return null;
  const current = latestPriceAtOrBefore(altHistory, todayIso);
  if (!current) return null;

  const equivalentShares = investmentAmount / purchase.effectivePrice;
  const currentValue = equivalentShares * current.close_price;
  const eligible = computeEligibleDividends(altDistributions, purchaseDate, equivalentShares);
  const dividendsReceived = eligible.reduce((sum, d) => sum + d.totalReceived, 0);
  const { pct: totalReturnPct } = computeTotalReturn(investmentAmount, currentValue, dividendsReceived);

  const windowCloses = altHistory
    .filter((h) => h.close_price != null && h.trade_date >= purchase.effectiveDate && h.trade_date <= todayIso)
    .map((h) => h.close_price as number);
  const maxDrawdownPct = computeMaxDrawdownPct(windowCloses);

  return { currentValue, dividendsReceived, totalReturnPct, maxDrawdownPct };
}

export function detectSplitWarnings(
  history: PriceHistoryPoint[],
  fromDate: string,
  toDate: string
): { date: string; ratio: number }[] {
  const points = history.filter(
    (h): h is { trade_date: string; close_price: number } =>
      h.close_price != null && h.trade_date >= fromDate && h.trade_date <= toDate
  );
  const warnings: { date: string; ratio: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].close_price;
    const curr = points[i].close_price;
    if (prev <= 0) continue;
    const ratio = curr / prev;
    if (ratio < SPLIT_RATIO_LOW || ratio > SPLIT_RATIO_HIGH) {
      warnings.push({ date: points[i].trade_date, ratio });
    }
  }
  return warnings;
}
