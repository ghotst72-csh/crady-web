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
        "expense_ratio, aum, inception_date, asset_class, benchmark, holdings_count"
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
        "volatility_30d, volatility_90d, max_drawdown, recent_return_30d, recent_return_90d"
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
  const { data, error } = await supabase
    .from("next_predictions")
    .select("ticker, target_ex_date, target_pay_date, predicted_amount, confidence_score")
    .eq("ticker", ticker)
    .order("confidence_score", { ascending: false })
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

/** Annualized yield estimate — sum of last 12 distributions / current price. */
export function computeAnnualYieldPct(
  distributions: DistributionRow[],
  currentPrice: number | null
): number | null {
  if (!currentPrice || currentPrice <= 0) return null;
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
  const sum = distributions
    .filter((d) => d.amount != null && new Date(d.pay_date).getTime() >= oneYearAgo)
    .reduce((acc, d) => acc + (d.amount ?? 0), 0);
  if (sum <= 0) return null;
  return (sum / currentPrice) * 100;
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

export async function searchEtfs(
  query: string,
  limit = 20
): Promise<{ ticker: string; name: string | null; provider_id: string }[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("etfs")
    .select("ticker, name, provider_id")
    .or(`ticker.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
