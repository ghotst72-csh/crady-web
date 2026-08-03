export type ActivitySource = "official" | "ai" | "crady" | "investor" | "moderator" | "market";

export type ActivityAuthor = {
  displayName: string;
  expertiseBadge: string | null;
};

/** The one central object — but this type covers investor rows specifically
 * (questions/discussions/replies, always with a real author). Phase 2's
 * pipeline-generated official/market/crady rows use AutomatedActivityItem
 * below instead: same table, but a genuinely different shape (no author, no
 * replies, carries occurredAt/sourceUrl/supportingMetrics/language) rather
 * than force-fitting both into one type. */
export type ActivityItem = {
  id: string;
  ticker: string;
  source: ActivitySource;
  type: "question" | "discussion" | "reply";
  userId: string | null;
  parentId: string | null;
  title: string | null;
  body: string;
  replyCount: number;
  editedAt: string | null;
  createdAt: string;
  author: ActivityAuthor | null;
};

/** One Official/Market/CRADY Analysis row written by
 * generate_activity_items.py (CRADY Activity Engine Phase 2) — real,
 * deduplicated, rule-template-generated (never an LLM call). `title`/`body`
 * are the headline/summary, already rendered in the row's own `language` —
 * the display layer doesn't re-template these, just fetches and shows them.
 * `type` is intentionally free-form (see lib/activity/badges.ts for the
 * category each type maps to), matching activity_items.type's own lack of a
 * CHECK enum. */
export type AutomatedActivityItem = {
  id: string;
  ticker: string;
  source: Exclude<ActivitySource, "investor" | "moderator">;
  type: string;
  title: string;
  body: string;
  occurredAt: string;
  sourceUrl: string | null;
  supportingMetrics: Record<string, unknown> | null;
  language: "en" | "ko";
};

export type VoteSummary = {
  bull: number;
  bear: number;
  neutral: number;
  total: number;
};

export type ActivityCounts = {
  questionCount: number;
  totalReplies: number;
  voteCount: number;
};

/** One real, timestamped official event for a ticker — a distribution row
 * that has actually been declared, not a prediction. Feeds the virtual
 * "official"-source entries in the unified stream. */
export type OfficialEvent = {
  ticker: string;
  amount: number | null;
  declarationDate: string;
  exDate: string;
  payDate: string;
};

/** The display-layer projection of the unified stream — every entry, real
 * or virtually-computed, ends up in this one shape for EtfActivityStream to
 * render. `detail` is populated only for real Activity Engine Phase 2 rows
 * (Official/Market/CRADY Analysis) — it's what powers the expandable
 * "why/how" disclosure per entry; investor entries and the virtual AI
 * Outlook pointer leave it undefined and render as a plain row. */
export type ActivityStreamEntry = {
  id: string;
  source: ActivitySource;
  timestamp: string;
  label: string;
  href: string | null;
  detail?: {
    type: string;
    summary: string;
    supportingMetrics: Record<string, unknown> | null;
  };
};
