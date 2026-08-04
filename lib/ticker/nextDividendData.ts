import { supabase } from "@/lib/supabase";

/** CRADY Engagement & Intelligence Phase 2, Part A — raw Supabase fetchers
 * for the Next Dividend Intelligence section. Kept separate from
 * lib/ticker/nextDividendIntelligence.ts (the pure, testable templating
 * logic) — same split already established by lib/ticker/enrichment.ts vs.
 * the ticker page's own data-fetching. */

export type FullNextPrediction = {
  ticker: string;
  targetExDate: string | null;
  targetPayDate: string | null;
  predictedAmount: number | null;
  confidenceScore: number | null;
  predictionMethod: string | null;
  recentAvgAmount: number | null;
  recentWeightedAmount: number | null;
  recentErrorPercent: number | null;
  recentVolatility: number | null;
  underlyingTicker: string | null;
  underlyingMomentum: number | null;
  explanation: string | null;
  cautionNote: string | null;
};

/** The full next_predictions row (not just the 5 fields getNextPrediction
 * selects) — this section needs the richer real fields (recent_volatility,
 * recent_avg_amount, underlying_ticker, the pipeline's own explanation
 * text) that the rest of the site never surfaces. */
export async function getFullNextPrediction(ticker: string): Promise<FullNextPrediction | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("next_predictions")
    .select(
      "ticker, target_ex_date, target_pay_date, predicted_amount, confidence_score, prediction_method, recent_avg_amount, recent_weighted_amount, recent_error_percent, recent_volatility, underlying_ticker, underlying_momentum, explanation, caution_note"
    )
    .eq("ticker", ticker)
    .gte("target_pay_date", today)
    .order("target_pay_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ticker: data.ticker,
    targetExDate: data.target_ex_date,
    targetPayDate: data.target_pay_date,
    predictedAmount: data.predicted_amount,
    confidenceScore: data.confidence_score,
    predictionMethod: data.prediction_method,
    recentAvgAmount: data.recent_avg_amount,
    recentWeightedAmount: data.recent_weighted_amount,
    recentErrorPercent: data.recent_error_percent,
    recentVolatility: data.recent_volatility,
    underlyingTicker: data.underlying_ticker,
    underlyingMomentum: data.underlying_momentum,
    explanation: data.explanation,
    cautionNote: data.caution_note,
  };
}

export type NextScheduleRow = {
  declarationDate: string | null;
  exDate: string;
  recordDate: string | null;
  payDate: string;
  sourceUrl: string | null;
};

/** The soonest future row in `distributions` with no amount yet — a real,
 * scraped provider schedule entry (confirmed via direct query: every such
 * row sitewide carries a real source_url pointing at the issuer's own
 * distribution-schedule page), distinct from CRADY's own pattern-based
 * next_predictions estimate. When this exists, the date fields themselves
 * are real ("Scheduled"); only the dollar amount is still pending. */
export async function getNextScheduleRow(ticker: string): Promise<NextScheduleRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("distributions")
    .select("declaration_date, ex_date, record_date, pay_date, source_url")
    .eq("ticker", ticker)
    .is("amount", null)
    .gte("ex_date", today)
    .order("ex_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    declarationDate: data.declaration_date,
    exDate: data.ex_date,
    recordDate: data.record_date,
    payDate: data.pay_date,
    sourceUrl: data.source_url,
  };
}

export type RecentDeclaredDistribution = {
  declarationDate: string | null;
  exDate: string;
  payDate: string;
  amount: number;
};

/** Last N actually-declared (amount != null) distributions, most recent
 * first — feeds the Recent Distribution Pattern panel, the Expected Range
 * calculation, and the Schedule Pattern (day-of-week) summary. */
export async function getRecentDeclaredDistributions(
  ticker: string,
  limit = 12
): Promise<RecentDeclaredDistribution[]> {
  const { data, error } = await supabase
    .from("distributions")
    .select("declaration_date, ex_date, pay_date, amount")
    .eq("ticker", ticker)
    .not("amount", "is", null)
    .order("ex_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((d) => ({
    declarationDate: d.declaration_date,
    exDate: d.ex_date,
    payDate: d.pay_date,
    amount: d.amount,
  }));
}
