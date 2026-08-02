import { supabase } from "@/lib/supabase";
import type { ActivityAuthor, ActivityCounts, ActivityItem, OfficialEvent, VoteSummary } from "./types";

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
