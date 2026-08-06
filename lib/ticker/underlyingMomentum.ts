import { supabase } from "@/lib/supabase";

/** Intelligence 4.0 — real per-underlying-stock volatility/return data.
 * Confirmed via direct query (2026-08) that this table (4,480 rows,
 * refreshed regularly by the pipeline's calculate_underlying_momentum.py)
 * is readable by the web app's anon key, unlike the RLS-blocked/schema-
 * mismatched `underlying_price_history` table Phase 2 investigated and
 * gave up on. This is a genuinely different, usable table. */
export type UnderlyingMomentumRow = {
  underlying_ticker: string;
  metric_date: string;
  return_1d: number | null;
  return_5d: number | null;
  return_10d: number | null;
  return_20d: number | null;
  return_30d: number | null;
  volatility_10d: number | null;
  volatility_20d: number | null;
  volatility_30d: number | null;
  max_drawdown_30d: number | null;
};

export async function getUnderlyingMomentum(
  underlyingTicker: string
): Promise<UnderlyingMomentumRow | null> {
  const { data, error } = await supabase
    .from("underlying_momentum_metrics")
    .select(
      "underlying_ticker, metric_date, return_1d, return_5d, return_10d, return_20d, return_30d, " +
        "volatility_10d, volatility_20d, volatility_30d, max_drawdown_30d"
    )
    .eq("underlying_ticker", underlyingTicker)
    .order("metric_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as UnderlyingMomentumRow | null;
}
