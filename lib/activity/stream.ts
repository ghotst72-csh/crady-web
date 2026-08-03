import type { ActivityItem, ActivityStreamEntry, AutomatedActivityItem } from "./types";

export type StreamMergeInput = {
  ticker: string;
  /** etf_risk_metrics.calculated_at for this ticker — powers only the
   * virtual "AI Outlook refreshed" entry (a pointer to the #ai-outlook
   * section, not a claim about what changed). The generic "CRADY risk score
   * updated" entry that used to fire unconditionally every day was removed
   * in Activity Engine Phase 2 — generate_activity_items.py's score_change/
   * risk_level_change events (in automatedItems below) now cover that same
   * ground, but only when the score/level actually changed, which is
   * exactly the kind of "don't repeat the same fact daily" discipline the
   * product spec asks for. */
  riskCalculatedAt: string | null;
  /** Real, already-inserted source: "investor" activity_items (top-level
   * items only — replies don't get their own stream row, they're folded
   * into their parent's InvestorDiscussion thread instead). */
  topLevelItems: ActivityItem[];
  /** Real Official/Market/CRADY Analysis rows written by
   * generate_activity_items.py (Activity Engine Phase 2) — already
   * rendered in the requested language, already deduplicated. Replaces the
   * old officialEvents-based virtual "distribution declared" entry: once
   * the pipeline is writing real distribution_event rows, computing a
   * second, virtual version of the same fact here would be exactly the
   * duplication the product spec prohibits. */
  automatedItems: AutomatedActivityItem[];
  limit?: number;
};

/** Merges every source into one chronological feed. Investor entries are
 * real activity_items rows; automated (official/market/crady/ai) entries are
 * either real Phase 2 rows or (for the AI Outlook pointer only) a virtual
 * entry computed from data fetched elsewhere. Zero synthetic content either
 * way: every entry traces back to a real row. Pure function, no I/O, easy to
 * unit test. */
export function buildActivityStreamEntries(input: StreamMergeInput, lang: "en" | "ko" = "en"): ActivityStreamEntry[] {
  const { riskCalculatedAt, topLevelItems, automatedItems, limit = 8 } = input;
  const entries: ActivityStreamEntry[] = [];

  if (riskCalculatedAt) {
    entries.push({
      id: `ai-${riskCalculatedAt}`,
      source: "ai",
      timestamp: riskCalculatedAt,
      label: lang === "ko" ? "AI 브리핑 업데이트" : "AI Outlook refreshed",
      href: "#ai-outlook",
    });
  }

  for (const item of automatedItems) {
    entries.push({
      id: `automated-${item.id}`,
      source: item.source,
      timestamp: item.occurredAt,
      label: item.title,
      href: item.sourceUrl,
      detail: { type: item.type, summary: item.body, supportingMetrics: item.supportingMetrics },
    });
  }

  for (const item of topLevelItems) {
    entries.push({
      id: `investor-${item.id}`,
      source: "investor",
      timestamp: item.createdAt,
      label:
        item.type === "question"
          ? lang === "ko"
            ? `새 질문: "${item.title}"`
            : `New question: "${item.title}"`
          : lang === "ko"
            ? "새 토론이 시작되었습니다"
            : "New discussion started",
      href: `#activity-item-${item.id}`,
    });
  }

  return entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, limit);
}
