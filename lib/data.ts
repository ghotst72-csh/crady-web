import { supabase } from "./supabase";

export type EtfRow = {
  ticker: string;
  provider_id: string;
  name: string | null;
  category: string | null;
  payout_frequency: string | null;
  source_url: string | null;
  short_description: string | null;
  long_description: string | null;
  investment_strategy: string | null;
  risk_summary: string | null;
  expense_ratio: string | null;
  aum: string | null;
  inception_date: string | null;
  asset_class: string | null;
  benchmark: string | null;
  holdings_count: number | null;
  created_at: string | null;
};

export type RiskMetricsRow = {
  ticker: string;
  crady_score: number | null;
  risk_level: string | null;
  profile_type: string | null;
  dividend_stability_score: number | null;
  volatility_30d: number | null;
  volatility_90d: number | null;
  max_drawdown: number | null;
  recent_return_30d: number | null;
  recent_return_90d: number | null;
  calculated_at: string | null;
};

export type RegimeProfileRow = {
  ticker: string;
  dominant_regime: string | null;
  regime_korean_name: string | null;
  description: string | null;
  avg_return_30d: number | null;
  avg_vol_30d: number | null;
};

export type DistributionRow = {
  ticker: string;
  ex_date: string;
  pay_date: string;
  declaration_date: string | null;
  amount: number | null;
};

export type PriceHistoryRow = {
  ticker: string;
  trade_date: string;
  close_price: number | null;
};

export type NextPredictionRow = {
  ticker: string;
  target_ex_date: string | null;
  target_pay_date: string | null;
  predicted_amount: number | null;
  confidence_score: number | null;
  prediction_method: string | null;
};

const PROVIDER_LABEL: Record<string, string> = {
  yieldmax: "YieldMax",
  roundhill: "Roundhill",
  defiance: "Defiance",
};

export function providerLabel(providerId: string) {
  return PROVIDER_LABEL[providerId] ?? providerId;
}

/** All tickers — used by generateStaticParams and sitemap.ts. */
export async function getAllTickers(): Promise<
  { ticker: string; provider_id: string }[]
> {
  const { data, error } = await supabase
    .from("etfs")
    .select("ticker, provider_id")
    .order("ticker", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getEtf(ticker: string): Promise<EtfRow | null> {
  const { data, error } = await supabase
    .from("etfs")
    .select(
      "ticker, provider_id, name, category, payout_frequency, source_url, " +
        "short_description, long_description, investment_strategy, risk_summary, " +
        "expense_ratio, aum, inception_date, asset_class, benchmark, holdings_count, created_at"
    )
    .eq("ticker", ticker)
    .maybeSingle();
  if (error) throw error;
  return data as EtfRow | null;
}

export async function getRiskMetrics(
  ticker: string
): Promise<RiskMetricsRow | null> {
  const { data, error } = await supabase
    .from("etf_risk_metrics")
    .select(
      "ticker, crady_score, risk_level, profile_type, dividend_stability_score, " +
        "volatility_30d, volatility_90d, max_drawdown, recent_return_30d, recent_return_90d, calculated_at"
    )
    .eq("ticker", ticker)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as RiskMetricsRow | null;
}

export async function getRegimeProfile(
  ticker: string
): Promise<RegimeProfileRow | null> {
  const { data, error } = await supabase
    .from("etf_regime_profiles")
    .select(
      "ticker, dominant_regime, regime_korean_name, description, avg_return_30d, avg_vol_30d"
    )
    .eq("ticker", ticker)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestPrice(
  ticker: string
): Promise<PriceHistoryRow | null> {
  const { data, error } = await supabase
    .from("etf_price_history")
    .select("ticker, trade_date, close_price")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPriceHistory(
  ticker: string,
  days = 90
): Promise<PriceHistoryRow[]> {
  const { data, error } = await supabase
    .from("etf_price_history")
    .select("ticker, trade_date, close_price")
    .eq("ticker", ticker)
    .order("trade_date", { ascending: false })
    .limit(days);
  if (error) throw error;
  return (data ?? []).reverse();
}

/** Actual paid distribution history (amount populated), most recent first. */
export async function getDistributions(
  ticker: string,
  limit = 12
): Promise<DistributionRow[]> {
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, ex_date, pay_date, declaration_date, amount")
    .eq("ticker", ticker)
    .not("amount", "is", null)
    .order("pay_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getNextPrediction(
  ticker: string
): Promise<NextPredictionRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  // Picking the highest-confidence row (the old behavior) could surface a
  // stale prediction from an already-paid cycle instead of the actual next
  // one — filter to future pay dates and take the soonest.
  const { data, error } = await supabase
    .from("next_predictions")
    .select(
      "ticker, target_ex_date, target_pay_date, predicted_amount, confidence_score, prediction_method"
    )
    .eq("ticker", ticker)
    .gte("target_pay_date", today)
    .order("target_pay_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSameProviderEtfs(
  providerId: string,
  excludeTicker: string,
  limit = 8
): Promise<{ ticker: string; name: string | null }[]> {
  const { data, error } = await supabase
    .from("etfs")
    .select("ticker, name")
    .eq("provider_id", providerId)
    .neq("ticker", excludeTicker)
    .order("ticker", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Distributions with pay_date within the last `days`, most recent first — a
 * date-bounded window (not a row-count cap), so annualizing from it isn't
 * skewed by payout frequency (a weekly payer needs ~13 rows to cover 90
 * days; a fixed `.limit(12)` silently truncates that and understates yield). */
export async function getDistributionsSince(
  ticker: string,
  days: number
): Promise<DistributionRow[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, ex_date, pay_date, declaration_date, amount")
    .eq("ticker", ticker)
    .not("amount", "is", null)
    .gte("pay_date", since)
    .order("pay_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Run-rate annualized yield: trailing `windowDays` of payments extrapolated
 * to a full year. Same methodology as getHomeSnapshot below, so a ticker
 * never shows two different "annual yield" numbers depending on the page. */
export function computeRunRateAnnualYieldPct(
  distributions: { amount: number | null }[],
  currentPrice: number | null,
  windowDays = 90
): number | null {
  if (!currentPrice || currentPrice <= 0) return null;
  const sum = distributions.reduce((acc, d) => acc + (d.amount ?? 0), 0);
  if (sum <= 0) return null;
  return ((sum / windowDays) * 365 / currentPrice) * 100;
}

// ── Ranking / homepage aggregate queries ─────────────────────────────────────

export type RankingEntry = {
  ticker: string;
  provider_id: string;
  name: string | null;
  crady_score: number | null;
  risk_level: string | null;
};

export async function getTopByCradyScore(limit = 10): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from("etf_risk_metrics")
    .select("ticker, crady_score, risk_level")
    .not("crady_score", "is", null)
    .order("crady_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const tickers = rows.map((r) => r.ticker);
  const { data: etfRows, error: etfErr } = await supabase
    .from("etfs")
    .select("ticker, provider_id, name")
    .in("ticker", tickers);
  if (etfErr) throw etfErr;
  const byTicker = new Map((etfRows ?? []).map((e) => [e.ticker, e]));

  return rows.map((r) => ({
    ticker: r.ticker,
    provider_id: byTicker.get(r.ticker)?.provider_id ?? "",
    name: byTicker.get(r.ticker)?.name ?? null,
    crady_score: r.crady_score,
    risk_level: r.risk_level,
  }));
}

export type UpcomingDividend = {
  ticker: string;
  ex_date: string;
  pay_date: string;
  amount: number | null;
};

export async function getUpcomingDividends(
  limit = 20
): Promise<UpcomingDividend[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, ex_date, pay_date, amount")
    .gte("pay_date", today)
    .order("pay_date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ── Home page snapshot — one bulk fetch powering every ranking section ───────
// Built from etf_risk_metrics.latest_close_price (verified fresh — matches
// etf_price_history same-day close) + a 90-day distributions window (~800
// rows, comfortably under PostgREST's row cap) instead of etf_risk_metrics
// .recent_dividend_yield, which is populated for only 3 of 73 tickers and
// unusable for ranking.

export type EtfSnapshot = {
  ticker: string;
  provider_id: string;
  name: string | null;
  payoutFrequency: string | null;
  price: number | null;
  cradyScore: number | null;
  riskLevel: string | null;
  volatility30d: number | null;
  dividendStabilityScore: number | null;
  /** Run-rate annualized yield: (last-90-day paid sum / 90 * 365) / price * 100. */
  annualYieldPct: number | null;
  latestDividend: number | null;
  latestDividendDate: string | null;
  nextPredictedAmount: number | null;
  nextPredictedDate: string | null;
  nextPredictedConfidence: number | null;
  /** Latest payment vs the average of the rest of the 90-day window. */
  dividendTrend: "up" | "down" | "flat" | null;
  dividendTrendPct: number | null;
  /** etf_risk_metrics.calculated_at — when the nightly pipeline last computed this row. */
  calculatedAt: string | null;
};

export async function getHomeSnapshot(): Promise<EtfSnapshot[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [etfsRes, riskRes, distRes, predRes] = await Promise.all([
    supabase.from("etfs").select("ticker, provider_id, name, payout_frequency"),
    supabase
      .from("etf_risk_metrics")
      .select(
        "ticker, crady_score, risk_level, volatility_30d, dividend_stability_score, latest_close_price, calculated_at"
      ),
    supabase
      .from("distributions")
      .select("ticker, pay_date, amount")
      .not("amount", "is", null)
      .gte("pay_date", since90)
      .order("pay_date", { ascending: true }),
    // Ordering by confidence_score picked whichever row scored highest
    // regardless of date — a stale prediction from an already-paid cycle
    // could outrank the actual next one. Restrict to future pay dates and
    // sort by date so the soonest (first per ticker below) is the real
    // "next" prediction.
    supabase
      .from("next_predictions")
      .select("ticker, target_pay_date, predicted_amount, confidence_score")
      .gte("target_pay_date", todayStr)
      .order("target_pay_date", { ascending: true }),
  ]);
  if (etfsRes.error) throw etfsRes.error;
  if (riskRes.error) throw riskRes.error;
  if (distRes.error) throw distRes.error;
  if (predRes.error) throw predRes.error;

  const riskByTicker = new Map((riskRes.data ?? []).map((r) => [r.ticker, r]));

  const distByTicker = new Map<string, { pay_date: string; amount: number }[]>();
  for (const d of distRes.data ?? []) {
    if (d.amount == null) continue;
    if (!distByTicker.has(d.ticker)) distByTicker.set(d.ticker, []);
    distByTicker.get(d.ticker)!.push({ pay_date: d.pay_date, amount: d.amount });
  }

  const predByTicker = new Map<string, (typeof predRes.data)[number]>();
  for (const p of predRes.data ?? []) {
    if (!predByTicker.has(p.ticker)) predByTicker.set(p.ticker, p);
  }

  return (etfsRes.data ?? []).map((e) => {
    const risk = riskByTicker.get(e.ticker);
    const price = risk?.latest_close_price ?? null;
    const payments = distByTicker.get(e.ticker) ?? [];
    const pred = predByTicker.get(e.ticker);

    const annualYieldPct = computeRunRateAnnualYieldPct(payments, price, 90);

    const latest = payments[payments.length - 1] ?? null;
    const prior = payments.slice(0, -1);
    let dividendTrend: EtfSnapshot["dividendTrend"] = null;
    let dividendTrendPct: number | null = null;
    if (latest && prior.length > 0) {
      const priorAvg = prior.reduce((a, p) => a + p.amount, 0) / prior.length;
      if (priorAvg > 0) {
        dividendTrendPct = ((latest.amount - priorAvg) / priorAvg) * 100;
        dividendTrend =
          dividendTrendPct > 3 ? "up" : dividendTrendPct < -3 ? "down" : "flat";
      }
    }

    return {
      ticker: e.ticker,
      provider_id: e.provider_id,
      name: e.name,
      payoutFrequency:
        e.payout_frequency && e.payout_frequency.toLowerCase() !== "unknown"
          ? e.payout_frequency
          : null,
      price,
      cradyScore: risk?.crady_score ?? null,
      riskLevel: risk?.risk_level ?? null,
      volatility30d: risk?.volatility_30d ?? null,
      dividendStabilityScore: risk?.dividend_stability_score ?? null,
      annualYieldPct,
      latestDividend: latest?.amount ?? null,
      latestDividendDate: latest?.pay_date ?? null,
      nextPredictedAmount: pred?.predicted_amount ?? null,
      nextPredictedDate: pred?.target_pay_date ?? null,
      nextPredictedConfidence: pred?.confidence_score ?? null,
      dividendTrend,
      dividendTrendPct,
      calculatedAt: risk?.calculated_at ?? null,
    } satisfies EtfSnapshot;
  });
}

export function topByAnnualYield(rows: EtfSnapshot[], limit = 8) {
  return rows
    .filter((r) => r.annualYieldPct != null)
    .sort((a, b) => b.annualYieldPct! - a.annualYieldPct!)
    .slice(0, limit);
}

export function topByCradyScoreSnapshot(rows: EtfSnapshot[], limit = 8) {
  return rows
    .filter((r) => r.cradyScore != null)
    .sort((a, b) => b.cradyScore! - a.cradyScore!)
    .slice(0, limit);
}

export function topRecentlyIncreased(rows: EtfSnapshot[], limit = 8) {
  return rows
    .filter((r) => r.dividendTrend === "up")
    .sort((a, b) => (b.dividendTrendPct ?? 0) - (a.dividendTrendPct ?? 0))
    .slice(0, limit);
}

/** Annualized yield per unit of 30d volatility — higher is more yield for less risk. */
export function topByRiskEfficiency(rows: EtfSnapshot[], limit = 8) {
  return rows
    .filter((r) => r.annualYieldPct != null && r.volatility30d != null && r.volatility30d > 1)
    .map((r) => ({ ...r, efficiency: r.annualYieldPct! / r.volatility30d! }))
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, limit);
}

/** Highest dividend-stability-score first — the "안전성" ranking axis. */
export function topBySafety(rows: EtfSnapshot[], limit = 50) {
  return rows
    .filter((r) => r.dividendStabilityScore != null)
    .sort((a, b) => b.dividendStabilityScore! - a.dividendStabilityScore!)
    .slice(0, limit);
}

/** Largest latest-vs-prior dividend change first (both increases and decreases). */
export function topByGrowth(rows: EtfSnapshot[], limit = 50) {
  return rows
    .filter((r) => r.dividendTrendPct != null)
    .sort((a, b) => b.dividendTrendPct! - a.dividendTrendPct!)
    .slice(0, limit);
}

export function topByProvider(rows: EtfSnapshot[], providerId: string, limit = 4) {
  return rows
    .filter((r) => r.provider_id === providerId && r.cradyScore != null)
    .sort((a, b) => b.cradyScore! - a.cradyScore!)
    .slice(0, limit);
}

export type WeeklyDividend = {
  ticker: string;
  provider_id: string;
  name: string | null;
  ex_date: string;
  pay_date: string;
  amount: number | null;
};

/** Distributions (paid or scheduled) with pay_date in the next 7 days. */
export async function getThisWeekDividends(limit = 12): Promise<WeeklyDividend[]> {
  const today = new Date();
  const in7days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = today.toISOString().slice(0, 10);
  const in7Str = in7days.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, provider_id, ex_date, pay_date, amount")
    .gte("pay_date", todayStr)
    .lte("pay_date", in7Str)
    .order("pay_date", { ascending: true })
    .limit(limit * 3);
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];
  const tickers = [...new Set(rows.map((r) => r.ticker))];
  const { data: etfRows, error: etfErr } = await supabase
    .from("etfs")
    .select("ticker, name")
    .in("ticker", tickers);
  if (etfErr) throw etfErr;
  const nameByTicker = new Map((etfRows ?? []).map((e) => [e.ticker, e.name]));

  return rows.slice(0, limit).map((r) => ({
    ticker: r.ticker,
    provider_id: r.provider_id,
    name: nameByTicker.get(r.ticker) ?? null,
    ex_date: r.ex_date,
    pay_date: r.pay_date,
    amount: r.amount,
  }));
}

// ── 핵심 지표 요약 (4 number cards) ────────────────────────────────────────────

export type KeyMetrics = {
  todayCount: number;
  weekCount: number;
  nextPredictionCount: number;
  highScoreCount: number;
};

export async function getKeyMetrics(): Promise<KeyMetrics> {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [todayRes, weekRes, predRes, highScoreRes] = await Promise.all([
    supabase
      .from("distributions")
      .select("ticker", { count: "exact", head: true })
      .eq("pay_date", today),
    supabase
      .from("distributions")
      .select("ticker", { count: "exact", head: true })
      .gte("pay_date", today)
      .lte("pay_date", in7),
    supabase.from("next_predictions").select("ticker"),
    supabase
      .from("etf_risk_metrics")
      .select("ticker", { count: "exact", head: true })
      .gte("crady_score", 70),
  ]);
  if (todayRes.error) throw todayRes.error;
  if (weekRes.error) throw weekRes.error;
  if (predRes.error) throw predRes.error;
  if (highScoreRes.error) throw highScoreRes.error;

  const uniquePredictionTickers = new Set(
    (predRes.data ?? []).map((r) => r.ticker)
  ).size;

  return {
    todayCount: todayRes.count ?? 0,
    weekCount: weekRes.count ?? 0,
    nextPredictionCount: uniquePredictionTickers,
    highScoreCount: highScoreRes.count ?? 0,
  };
}

// ── Next Estimated Distributions timeline ────────────────────────────────────

export type NextDistributionEntry = EtfSnapshot & {
  /** Change from the last confirmed (actual) payment to the predicted next one. */
  changeFromLastPct: number | null;
};

/** ETFs with a registered next-payment prediction, soonest target_pay_date first.
 * Defense-in-depth: getHomeSnapshot's query already restricts to future
 * target_pay_dates, but a past-dated prediction must never render as
 * "next" here even if that upstream filter is ever changed or bypassed. */
export function nextDistributionsTimeline(
  rows: EtfSnapshot[],
  limit = 10
): NextDistributionEntry[] {
  const todayStr = new Date().toISOString().slice(0, 10);
  return rows
    .filter(
      (r) =>
        r.nextPredictedAmount != null &&
        r.nextPredictedDate != null &&
        r.nextPredictedDate >= todayStr
    )
    .sort(
      (a, b) =>
        new Date(a.nextPredictedDate!).getTime() -
        new Date(b.nextPredictedDate!).getTime()
    )
    .slice(0, limit)
    .map((r) => ({
      ...r,
      changeFromLastPct:
        r.latestDividend != null && r.latestDividend > 0
          ? ((r.nextPredictedAmount! - r.latestDividend) / r.latestDividend) * 100
          : null,
    }));
}
