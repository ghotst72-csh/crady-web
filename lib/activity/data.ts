import { supabase } from "@/lib/supabase";
import type { ActivityAuthor, ActivityCounts, ActivityItem, AutomatedActivityItem, OfficialEvent, VoteSummary } from "./types";

const FALLBACK_AUTHOR: ActivityAuthor = { displayName: "Investor", expertiseBadge: null };

const ITEM_COLUMNS =
  "id, ticker, source, type, user_id, parent_id, title, body, reply_count, edited_at, created_at";

type ItemRow = {
  id: string;
  ticker: string;
  source: string;
  type: string;
  user_id: string | null;
  parent_id: string | null;
  title: string | null;
  body: string;
  reply_count: number;
  edited_at: string | null;
  created_at: string;
};

/** activity_items and activity_profiles both FK to auth.users independently
 * — there's no FK PostgREST can embed across, so this is a manual
 * two-query join, the same pattern already used for distributions/etfs
 * throughout lib/data.ts. */
async function resolveAuthors(userIds: (string | null)[]): Promise<Map<string, ActivityAuthor>> {
  const uniqueIds = [...new Set(userIds.filter((id): id is string => id != null))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("activity_profiles")
    .select("user_id, display_name, expertise_badge")
    .in("user_id", uniqueIds);
  if (error) throw error;

  const map = new Map<string, ActivityAuthor>();
  for (const row of data ?? []) {
    map.set(row.user_id, { displayName: row.display_name, expertiseBadge: row.expertise_badge });
  }
  return map;
}

function toActivityItem(r: ItemRow, authors: Map<string, ActivityAuthor>): ActivityItem {
  return {
    id: r.id,
    ticker: r.ticker,
    source: r.source as ActivityItem["source"],
    type: r.type as ActivityItem["type"],
    userId: r.user_id,
    parentId: r.parent_id,
    title: r.title,
    body: r.body,
    replyCount: r.reply_count,
    editedAt: r.edited_at,
    createdAt: r.created_at,
    author: r.user_id ? (authors.get(r.user_id) ?? FALLBACK_AUTHOR) : null,
  };
}

/** Reverse-chronological feed of top-level investor items (questions and
 * discussion posts share one board — no separate "Hot Questions" list). */
export async function getTopLevelItems(ticker: string, limit = 30): Promise<ActivityItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select(ITEM_COLUMNS)
    .eq("ticker", ticker)
    .eq("source", "investor")
    .is("parent_id", null)
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as ItemRow[];

  const authors = await resolveAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => toActivityItem(r, authors));
}

/** Batch equivalent of fetching replies one parent at a time — one query
 * for the whole feed, grouped/capped in JS. */
export async function getRepliesForItems(
  parentIds: string[],
  perParentLimit = 3
): Promise<Map<string, ActivityItem[]>> {
  const map = new Map<string, ActivityItem[]>();
  if (parentIds.length === 0) return map;

  const { data, error } = await supabase
    .from("activity_items")
    .select(ITEM_COLUMNS)
    .in("parent_id", parentIds)
    .eq("status", "visible")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as ItemRow[];

  const authors = await resolveAuthors(rows.map((r) => r.user_id));

  for (const r of rows) {
    const parentId = r.parent_id!;
    const list = map.get(parentId) ?? [];
    if (list.length >= perParentLimit) continue;
    list.push(toActivityItem(r, authors));
    map.set(parentId, list);
  }
  return map;
}

export async function getTickerVoteSummary(ticker: string): Promise<VoteSummary> {
  const { data, error } = await supabase.from("activity_ticker_votes").select("vote").eq("ticker", ticker);
  if (error) throw error;
  const rows = data ?? [];

  const bull = rows.filter((r) => r.vote === "bull").length;
  const bear = rows.filter((r) => r.vote === "bear").length;
  const neutral = rows.filter((r) => r.vote === "neutral").length;
  return { bull, bear, neutral, total: rows.length };
}

/** Feeds buildActivityConfidence()/the "not enough data yet" fallback logic
 * — a real, zero-fabrication signal-volume count, never a sentiment claim. */
export async function getActivityCounts(ticker: string): Promise<ActivityCounts> {
  const [{ count: questionCount }, topLevel, { count: voteCount }] = await Promise.all([
    supabase
      .from("activity_items")
      .select("id", { count: "exact", head: true })
      .eq("ticker", ticker)
      .eq("source", "investor")
      .eq("status", "visible")
      .eq("type", "question"),
    supabase
      .from("activity_items")
      .select("reply_count")
      .eq("ticker", ticker)
      .eq("source", "investor")
      .is("parent_id", null)
      .eq("status", "visible"),
    supabase
      .from("activity_ticker_votes")
      .select("id", { count: "exact", head: true })
      .eq("ticker", ticker),
  ]);

  const totalReplies = (topLevel.data ?? []).reduce((sum, r) => sum + (r.reply_count ?? 0), 0);

  return {
    questionCount: questionCount ?? 0,
    totalReplies,
    voteCount: voteCount ?? 0,
  };
}

/** Real, declared (not predicted) distribution events for one ticker — the
 * virtual "official"-source entries in the unified activity stream. Reuses
 * the existing `distributions` table (already RLS-locked to public
 * SELECT), not a new query surface. */
export async function getRecentOfficialEvents(ticker: string, limit = 5): Promise<OfficialEvent[]> {
  const { data, error } = await supabase
    .from("distributions")
    .select("ticker, amount, declaration_date, ex_date, pay_date")
    .eq("ticker", ticker)
    .not("declaration_date", "is", null)
    .order("declaration_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ticker: r.ticker,
    amount: r.amount,
    declarationDate: r.declaration_date as string,
    exDate: r.ex_date,
    payDate: r.pay_date,
  }));
}

/** Most-discussed real topic in the trailing N days — a top-level item's
 * own title (questions) or body lead (discussion), never fabricated;
 * returns null when there's no real activity yet. */
export async function getMostDiscussedItem(
  ticker: string,
  days = 7
): Promise<{ title: string; replyCount: number } | null> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("activity_items")
    .select("title, body, reply_count")
    .eq("ticker", ticker)
    .eq("source", "investor")
    .is("parent_id", null)
    .eq("status", "visible")
    .gte("created_at", since)
    .order("reply_count", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.reply_count === 0) return null;
  return {
    title: data.title ?? data.body.slice(0, 60),
    replyCount: data.reply_count,
  };
}

/** Top-N real topics by engagement (reply_count) in the trailing N days —
 * the "Trending Topics" list, same query shape as getMostDiscussedItem
 * above but returning several rows instead of one. Only items with at
 * least one real reply count as "trending" — zero-engagement items don't
 * clutter the list, matching the honest-empty-state discipline used
 * throughout this table (an empty array here means the UI renders "No
 * trending topics yet," never a fabricated one). */
export async function getTrendingTopics(
  ticker: string,
  limit = 3,
  days = 7
): Promise<{ id: string; title: string; replyCount: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("activity_items")
    .select("id, title, body, reply_count")
    .eq("ticker", ticker)
    .eq("source", "investor")
    .is("parent_id", null)
    .eq("status", "visible")
    .gte("created_at", since)
    .gt("reply_count", 0)
    .order("reply_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title ?? r.body.slice(0, 60),
    replyCount: r.reply_count,
  }));
}

/** New questions/replies in the trailing 7 days — feeds buildWeeklyRecap. */
export async function getWeeklyActivityCounts(
  ticker: string
): Promise<{ newQuestions7d: number; newReplies7d: number }> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ count: newQuestions7d }, { count: newReplies7d }] = await Promise.all([
    supabase
      .from("activity_items")
      .select("id", { count: "exact", head: true })
      .eq("ticker", ticker)
      .eq("source", "investor")
      .eq("status", "visible")
      .eq("type", "question")
      .gte("created_at", since),
    supabase
      .from("activity_items")
      .select("id", { count: "exact", head: true })
      .eq("ticker", ticker)
      .eq("source", "investor")
      .eq("status", "visible")
      .eq("type", "reply")
      .gte("created_at", since),
  ]);

  return { newQuestions7d: newQuestions7d ?? 0, newReplies7d: newReplies7d ?? 0 };
}

// ── CRADY Activity Engine — Phase 2 ──────────────────────────────────────────

type AutomatedItemRow = {
  id: string;
  ticker: string;
  source: string;
  type: string;
  title: string | null;
  body: string;
  occurred_at: string | null;
  source_url: string | null;
  supporting_metrics: Record<string, unknown> | null;
  language: string;
};

function toAutomatedItem(r: AutomatedItemRow): AutomatedActivityItem {
  return {
    id: r.id,
    ticker: r.ticker,
    source: r.source as AutomatedActivityItem["source"],
    type: r.type,
    title: r.title ?? r.body.slice(0, 80),
    body: r.body,
    occurredAt: r.occurred_at ?? "", // always set by the generator in practice
    sourceUrl: r.source_url,
    supportingMetrics: r.supporting_metrics,
    language: (r.language as "en" | "ko") ?? "en",
  };
}

/** Official/Market/CRADY Analysis rows written by generate_activity_items.py
 * — real, deduplicated, already rendered in the requested language (the
 * generator writes one EN row and one KO row per event, never translates on
 * read). Returns [] (not an error) if the Phase 2 migration hasn't been
 * applied yet or the pipeline hasn't run since — same honest-empty
 * discipline as every other function in this file. */
export async function getAutomatedActivityItems(
  ticker: string,
  lang: "en" | "ko" = "en",
  limit = 10
): Promise<AutomatedActivityItem[]> {
  const { data, error } = await supabase
    .from("activity_items")
    .select("id, ticker, source, type, title, body, occurred_at, source_url, supporting_metrics, language")
    .eq("ticker", ticker)
    .eq("status", "visible")
    .eq("language", lang)
    .in("source", ["official", "market", "crady", "ai"])
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) return []; // schema not migrated yet on this deploy, or a transient error — never break the page for this
  return ((data ?? []) as AutomatedItemRow[]).map(toAutomatedItem);
}

/** Real, zero-fabrication inputs for the "Today's Activity" summary card —
 * every field is independently honest-nullable; the card omits whatever
 * isn't real rather than inventing a placeholder. "Today" highlights
 * (distribution/CRADY outlook) are gated to events that actually occurred
 * within the last 24h — showing yesterday's distribution under a "today"
 * label would be the kind of fabricated-freshness this whole engine exists
 * to avoid. */
export type TodaysActivitySummaryInput = {
  newActivityCount: number;
  distributionToday: { amount: number; exDate: string } | null;
  cradyHeadlineToday: string | null;
};

export async function getTodaysActivitySummaryInputs(
  ticker: string,
  lang: "en" | "ko" = "en"
): Promise<TodaysActivitySummaryInput> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [countResp, automatedItems] = await Promise.all([
    supabase
      .from("activity_items")
      .select("id", { count: "exact", head: true })
      .eq("ticker", ticker)
      .eq("status", "visible")
      .or(`occurred_at.gte.${todayIso},created_at.gte.${todayIso}`),
    getAutomatedActivityItems(ticker, lang, 5),
  ]);

  const isRecent = (i: AutomatedActivityItem) => new Date(i.occurredAt) >= since24h;
  const distributionItem = automatedItems.find((i) => i.type === "distribution_event" && isRecent(i)) ?? null;
  const cradyItem =
    automatedItems.find((i) => (i.source === "crady" || i.source === "ai") && isRecent(i)) ?? null;

  const metrics = distributionItem?.supportingMetrics as { amount?: number } | null;

  return {
    newActivityCount: countResp.count ?? 0,
    distributionToday:
      distributionItem && metrics?.amount != null
        ? { amount: metrics.amount, exDate: distributionItem.occurredAt.slice(0, 10) }
        : null,
    cradyHeadlineToday: cradyItem?.title ?? null,
  };
}

/** Sitewide Activity entry points for Home/Ranking (product requirement:
 * small, real, 3-5 items each, always linking back to the ETF's own page —
 * never a full community feed on these pages). Each list is independently
 * honest-empty; a site with no real activity yet returns [] for all four,
 * and the caller renders nothing rather than a placeholder. */
export type SitewideActivityHighlights = {
  mostActiveToday: { ticker: string; count: number }[];
  latestDistributions: { ticker: string; title: string; occurredAt: string }[];
  mostDiscussed: { ticker: string; title: string; replyCount: number }[];
  newOutlooks: { ticker: string; title: string; occurredAt: string }[];
};

export async function getSitewideActivityHighlights(
  lang: "en" | "ko" = "en",
  limit = 5
): Promise<SitewideActivityHighlights> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [todayItemsResp, distResp, discussedResp, outlookResp] = await Promise.all([
    supabase
      .from("activity_items")
      .select("ticker")
      .eq("status", "visible")
      .or(`occurred_at.gte.${todayIso},created_at.gte.${todayIso}`)
      .limit(300),
    supabase
      .from("activity_items")
      .select("ticker, title, occurred_at")
      .eq("status", "visible")
      .eq("language", lang)
      .eq("source", "official")
      .eq("type", "distribution_event")
      .order("occurred_at", { ascending: false })
      .limit(limit * 3),
    supabase
      .from("activity_items")
      .select("ticker, title, body, reply_count")
      .eq("status", "visible")
      .eq("source", "investor")
      .is("parent_id", null)
      .gt("reply_count", 0)
      .order("reply_count", { ascending: false })
      .limit(limit * 3),
    supabase
      .from("activity_items")
      .select("ticker, title, occurred_at")
      .eq("status", "visible")
      .eq("language", lang)
      .in("source", ["crady", "ai"])
      .order("occurred_at", { ascending: false })
      .limit(limit * 3),
  ]);

  const countByTicker = new Map<string, number>();
  for (const row of todayItemsResp.data ?? []) {
    countByTicker.set(row.ticker, (countByTicker.get(row.ticker) ?? 0) + 1);
  }
  const mostActiveToday = [...countByTicker.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([ticker, count]) => ({ ticker, count }));

  function dedupeByTicker<T extends { ticker: string }>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const r of rows) {
      if (seen.has(r.ticker)) continue;
      seen.add(r.ticker);
      out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  }

  const latestDistributions = dedupeByTicker(
    (distResp.data ?? []).map((r) => ({ ticker: r.ticker, title: r.title ?? "", occurredAt: r.occurred_at ?? "" }))
  );
  const mostDiscussed = dedupeByTicker(
    (discussedResp.data ?? []).map((r) => ({
      ticker: r.ticker,
      title: r.title ?? r.body.slice(0, 60),
      replyCount: r.reply_count,
    }))
  );
  const newOutlooks = dedupeByTicker(
    (outlookResp.data ?? []).map((r) => ({ ticker: r.ticker, title: r.title ?? "", occurredAt: r.occurred_at ?? "" }))
  );

  return { mostActiveToday, latestDistributions, mostDiscussed, newOutlooks };
}
