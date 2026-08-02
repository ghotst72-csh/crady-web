export type ActivitySource = "official" | "ai" | "crady" | "investor" | "moderator";

export type ActivityAuthor = {
  displayName: string;
  expertiseBadge: string | null;
};

/** The one central object. An official distribution announcement, an AI
 * Outlook refresh, a CRADY risk-score update, an investor question, an
 * investor reply — all the same shape, distinguished only by `source`. In
 * Phase 1, only `source: "investor"` rows are ever actually inserted;
 * official/ai/crady entries are still computed virtually at render time
 * (see lib/activity/stream.ts) from data the pipeline already produces
 * elsewhere (`distributions`, `etf_risk_metrics`) — this type is shaped so a
 * future phase can start inserting those as real rows with zero schema or
 * type change. `source: "moderator"` is reserved, unused this phase. */
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
 * render. */
export type ActivityStreamEntry = {
  id: string;
  source: ActivitySource;
  timestamp: string;
  label: string;
  href: string | null;
};
