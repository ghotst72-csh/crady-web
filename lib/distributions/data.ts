import { supabase } from "@/lib/supabase";
import type { DistributionRow } from "./table";

export type AnnouncementRow = {
  id: string;
  issuer: string;
  provider_id: string;
  title: string;
  slug: string;
  announcement_date: string;
  source_url: string;
  source_type: string;
  etf_count: number;
  status: string;
  fetched_at: string;
  published_at: string | null;
};

const ANNOUNCEMENT_COLUMNS =
  "id, issuer, provider_id, title, slug, announcement_date, source_url, source_type, etf_count, status, fetched_at, published_at";

export async function getLatestAnnouncement(): Promise<AnnouncementRow | null> {
  const { data, error } = await supabase
    .from("distribution_announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("status", "published")
    .order("announcement_date", { ascending: false })
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAnnouncementBySlug(slug: string): Promise<AnnouncementRow | null> {
  const { data, error } = await supabase
    .from("distribution_announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Newest first — powers the /distributions/archive index. */
export async function getAllAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await supabase
    .from("distribution_announcements")
    .select(ANNOUNCEMENT_COLUMNS)
    .order("announcement_date", { ascending: false })
    .order("fetched_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Every announcement slug — for generateStaticParams on both the (en) and
 * ko archive-detail routes. */
export async function getAllAnnouncementSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from("distribution_announcements").select("slug");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}

/** Distribution rows for one announcement, joined with etfs for name/
 * frequency via a manual two-query join (distributions/etfs have no FK
 * PostgREST can embed across — same pattern already used throughout
 * lib/data.ts, e.g. getTopByCradyScore). */
export async function getDistributionRowsForAnnouncement(
  announcementId: string
): Promise<DistributionRow[]> {
  const { data: rows, error } = await supabase
    .from("distributions")
    .select(
      "ticker, provider_id, ex_date, pay_date, amount, distribution_rate, sec_yield_30d, roc_rate, source_url"
    )
    .eq("announcement_id", announcementId)
    .order("ticker", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const tickers = rows.map((r) => r.ticker);
  const { data: etfRows, error: etfErr } = await supabase
    .from("etfs")
    .select("ticker, name, payout_frequency")
    .in("ticker", tickers);
  if (etfErr) throw etfErr;
  const etfByTicker = new Map((etfRows ?? []).map((e) => [e.ticker, e]));

  return rows.map((r) => {
    const etf = etfByTicker.get(r.ticker);
    return {
      ticker: r.ticker,
      etfName: etf?.name ?? null,
      providerId: r.provider_id,
      frequency:
        etf?.payout_frequency && etf.payout_frequency.toLowerCase() !== "unknown"
          ? etf.payout_frequency
          : null,
      distributionPerShare: r.amount,
      distributionRate: r.distribution_rate,
      secYield30d: r.sec_yield_30d,
      rocPercent: r.roc_rate,
      exDate: r.ex_date,
      payDate: r.pay_date,
      sourceUrl: r.source_url,
    } satisfies DistributionRow;
  });
}

export type RecentAnnouncedRow = DistributionRow & { announcedDate: string };

/** A cross-announcement "recently announced" feed for the homepage's
 * Recently Announced table (CRADY Homepage Final Redesign, 2026-08-12) —
 * unlike getDistributionRowsForAnnouncement (rows from ONE batch, sharing
 * one announcement_date), this pulls rows from the most recent several
 * announcement batches so each row can carry its own real announced date,
 * matching the approved design's per-row "Announced" column. Composes only
 * existing queries (getAllAnnouncements + getDistributionRowsForAnnouncement)
 * — no new tables, no pipeline changes. */
export async function getRecentAnnouncedDistributions(limit = 6): Promise<RecentAnnouncedRow[]> {
  const announcements = await getAllAnnouncements();
  const out: RecentAnnouncedRow[] = [];
  for (const announcement of announcements) {
    if (out.length >= limit) break;
    const rows = await getDistributionRowsForAnnouncement(announcement.id);
    for (const row of rows) {
      out.push({ ...row, announcedDate: announcement.announcement_date });
    }
  }
  return out.slice(0, limit);
}

export type OfficialDistributionForTicker = {
  ticker: string;
  amount: number | null;
  distributionRate: number | null;
  secYield30d: number | null;
  rocPercent: number | null;
  exDate: string;
  payDate: string;
  declarationDate: string | null;
  sourceUrl: string | null;
  announcementDate: string | null;
  announcementTitle: string | null;
  announcementSourceUrl: string | null;
};

/** The most recent officially-announced distribution for one ticker — for
 * the ticker-page "Latest Official Distribution" block (Part 5). */
export async function getLatestOfficialDistributionForTicker(
  ticker: string
): Promise<OfficialDistributionForTicker | null> {
  const { data, error } = await supabase
    .from("distributions")
    .select(
      "ticker, amount, distribution_rate, sec_yield_30d, roc_rate, ex_date, pay_date, declaration_date, source_url, announcement_id"
    )
    .eq("ticker", ticker)
    .not("amount", "is", null)
    .order("pay_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let announcementDate: string | null = null;
  let announcementTitle: string | null = null;
  let announcementSourceUrl: string | null = null;
  if (data.announcement_id) {
    const { data: ann } = await supabase
      .from("distribution_announcements")
      .select("announcement_date, title, source_url")
      .eq("id", data.announcement_id)
      .maybeSingle();
    if (ann) {
      announcementDate = ann.announcement_date;
      announcementTitle = ann.title;
      announcementSourceUrl = ann.source_url;
    }
  }

  return {
    ticker: data.ticker,
    amount: data.amount,
    distributionRate: data.distribution_rate,
    secYield30d: data.sec_yield_30d,
    rocPercent: data.roc_rate,
    exDate: data.ex_date,
    payDate: data.pay_date,
    declarationDate: data.declaration_date,
    sourceUrl: data.source_url,
    announcementDate,
    announcementTitle,
    announcementSourceUrl,
  };
}

export type DistributionChange = {
  ticker: string;
  currentAmount: number;
  priorAmount: number;
  changePct: number;
};

/** For each row in an announcement, finds the most recent PRIOR paid amount
 * for that ticker (pay_date before this announcement's) and computes %
 * change — powers the archive detail page's "largest increases/decreases"
 * and "highest/lowest ROC" sections (Part 7). One batched query for all
 * tickers rather than N per-ticker queries. */
export async function getAnnouncementChanges(
  rows: DistributionRow[]
): Promise<DistributionChange[]> {
  const tickers = rows.map((r) => r.ticker);
  if (tickers.length === 0) return [];
  const earliestPayDate = rows.reduce((min, r) => (r.payDate < min ? r.payDate : min), rows[0].payDate);

  const { data: priorRows, error } = await supabase
    .from("distributions")
    .select("ticker, amount, pay_date")
    .in("ticker", tickers)
    .not("amount", "is", null)
    .lt("pay_date", earliestPayDate)
    .order("pay_date", { ascending: false });
  if (error) throw error;

  const priorByTicker = new Map<string, number>();
  for (const r of priorRows ?? []) {
    if (!priorByTicker.has(r.ticker)) priorByTicker.set(r.ticker, r.amount as number);
  }

  const changes: DistributionChange[] = [];
  for (const row of rows) {
    if (row.distributionPerShare == null) continue;
    const prior = priorByTicker.get(row.ticker);
    if (prior == null || prior <= 0) continue;
    changes.push({
      ticker: row.ticker,
      currentAmount: row.distributionPerShare,
      priorAmount: prior,
      changePct: ((row.distributionPerShare - prior) / prior) * 100,
    });
  }
  return changes;
}

export type DistributionTrustStats = {
  distributionRecords: number;
  announcementsTracked: number;
};

/** Homepage trust-strip numbers (Homepage Phase 4, Part 6) — two plain
 * COUNT(*) queries via head:true (same zero-payload pattern getKeyMetrics
 * already uses in lib/data.ts), never a derived or estimated figure. */
export async function getDistributionTrustStats(): Promise<DistributionTrustStats> {
  const [distRes, annRes] = await Promise.all([
    supabase.from("distributions").select("ticker", { count: "exact", head: true }).not("amount", "is", null),
    supabase
      .from("distribution_announcements")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ]);
  if (distRes.error) throw distRes.error;
  if (annRes.error) throw annRes.error;
  return {
    distributionRecords: distRes.count ?? 0,
    announcementsTracked: annRes.count ?? 0,
  };
}

export type PredictionVsOfficial = {
  predictedAmount: number;
  actualAmount: number;
  targetPayDate: string;
  absoluteDifference: number;
  percentageError: number | null;
  evaluatedAt: string;
};

/** Real terminal evaluation outcomes written by the C:\CRADY pipeline's
 * evaluate_predictions.py — "pending" (target date hasn't resolved yet) and
 * "legacy" (pre-this-scheme rows) are excluded as not-yet-evaluated. The
 * literal string "evaluated" does not appear anywhere in this column — a
 * prior version of this file filtered for it and silently matched zero rows
 * sitewide, confirmed by direct query before this fix. */
const EVALUATED_STATUSES = ["matched", "close", "high_error"] as const;

/** The most recent EVALUATED prediction for a ticker (Part 6) — reads the
 * existing dividend_predictions table (already populated + evaluated by the
 * C:\CRADY pipeline's evaluate_predictions.py against real distributions
 * data), rather than re-implementing prediction-vs-actual matching. Only
 * ever returns a genuinely evaluated row — never fabricates a comparison
 * for a pending/unmatched prediction. */
export async function getPredictionVsOfficial(ticker: string): Promise<PredictionVsOfficial | null> {
  const { data, error } = await supabase
    .from("dividend_predictions")
    .select("predicted_amount, actual_amount, target_pay_date, prediction_error_pct, evaluation_status, created_at")
    .eq("ticker", ticker)
    .in("evaluation_status", EVALUATED_STATUSES)
    .order("target_pay_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.predicted_amount == null || data.actual_amount == null) return null;

  return {
    predictedAmount: data.predicted_amount,
    actualAmount: data.actual_amount,
    targetPayDate: data.target_pay_date,
    absoluteDifference: Math.abs(data.predicted_amount - data.actual_amount),
    percentageError: data.prediction_error_pct,
    evaluatedAt: data.created_at,
  };
}

export type EvaluatedPredictionRow = {
  targetPayDate: string;
  predictedAmount: number;
  actualAmount: number;
  percentageError: number | null;
  evaluationStatus: string;
};

export type SitewideEvaluatedPredictionRow = EvaluatedPredictionRow & { ticker: string };

/** Every real evaluated prediction sitewide, most recent first — the raw
 * input for Phase 2's Prediction Accuracy trust page (spec §11). Same
 * dedup discipline as getEvaluatedPredictionHistory (the pipeline
 * re-predicts the same real event multiple times before its ex-date); the
 * caller is expected to dedupe per (ticker, targetPayDate) — done here in
 * one pass since this query spans every ticker, not just one. Capped at a
 * generous row count, not the whole table, since PostgREST enforces a
 * server-side row cap regardless. */
export async function getSitewideEvaluatedPredictions(limit = 4000): Promise<SitewideEvaluatedPredictionRow[]> {
  const { data, error } = await supabase
    .from("dividend_predictions")
    .select("ticker, target_pay_date, predicted_amount, actual_amount, prediction_error_pct, evaluation_status, created_at")
    .in("evaluation_status", EVALUATED_STATUSES)
    .not("predicted_amount", "is", null)
    .not("actual_amount", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const seen = new Set<string>();
  const out: SitewideEvaluatedPredictionRow[] = [];
  for (const row of data ?? []) {
    const key = `${row.ticker}:${row.target_pay_date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ticker: row.ticker,
      targetPayDate: row.target_pay_date,
      predictedAmount: row.predicted_amount,
      actualAmount: row.actual_amount,
      percentageError: row.prediction_error_pct,
      evaluationStatus: row.evaluation_status,
    });
  }
  return out;
}

/** Every real evaluated prediction for a ticker, most recent first, for the
 * Prediction Track Record (§9). The pipeline re-predicts the same
 * upcoming payment multiple times before its ex-date, so raw rows contain
 * near-duplicates that all resolve to the same real-world event — this
 * dedupes to one row per target_pay_date (the row Supabase returns first
 * within that date, already ordered newest-created first) so "last 8
 * predictions" means 8 distinct real distributions, not 8 re-runs of the
 * same one. */
export async function getEvaluatedPredictionHistory(
  ticker: string,
  limit = 20
): Promise<EvaluatedPredictionRow[]> {
  const { data, error } = await supabase
    .from("dividend_predictions")
    .select("target_pay_date, predicted_amount, actual_amount, prediction_error_pct, evaluation_status, created_at")
    .eq("ticker", ticker)
    .in("evaluation_status", EVALUATED_STATUSES)
    .not("predicted_amount", "is", null)
    .not("actual_amount", "is", null)
    .order("target_pay_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 4); // headroom for dedup — several raw rows per real event
  if (error) throw error;

  const seen = new Set<string>();
  const out: EvaluatedPredictionRow[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.target_pay_date)) continue;
    seen.add(row.target_pay_date);
    out.push({
      targetPayDate: row.target_pay_date,
      predictedAmount: row.predicted_amount,
      actualAmount: row.actual_amount,
      percentageError: row.prediction_error_pct,
      evaluationStatus: row.evaluation_status,
    });
    if (out.length >= limit) break;
  }
  return out;
}
