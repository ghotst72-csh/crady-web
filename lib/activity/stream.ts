import type { ActivityItem, ActivityStreamEntry, OfficialEvent } from "./types";

export type StreamMergeInput = {
  ticker: string;
  officialEvents: OfficialEvent[];
  /** etf_risk_metrics.calculated_at for this ticker — a single real
   * timestamp powers both the virtual CRADY entry (the metric that
   * changed) and the virtual AI entry (the Outlook derived from it). No
   * entry is emitted for either if this is null — nothing synthetic. */
  riskCalculatedAt: string | null;
  /** Real, already-inserted source: "investor" activity_items (top-level
   * items only — replies don't get their own stream row, they're folded
   * into their parent's InvestorDiscussion thread instead). */
  topLevelItems: ActivityItem[];
  limit?: number;
};

/** Merges every source into one chronological feed — the "unified activity
 * stream" the product direction calls for. Official/AI/CRADY entries are
 * virtually computed here (Phase 1 doesn't insert real rows for them yet);
 * investor entries are real activity_items rows. Zero synthetic content
 * either way: every entry traces back to a real row fetched elsewhere on
 * the page. Pure function, no I/O, easy to unit test. */
export function buildActivityStreamEntries(input: StreamMergeInput, lang: "en" | "ko" = "en"): ActivityStreamEntry[] {
  const { officialEvents, riskCalculatedAt, topLevelItems, limit = 8 } = input;
  const entries: ActivityStreamEntry[] = [];

  for (const event of officialEvents) {
    entries.push({
      id: `official-${event.ticker}-${event.declarationDate}-${event.exDate}`,
      source: "official",
      timestamp: event.declarationDate,
      label:
        lang === "ko"
          ? event.amount != null
            ? `배당 확정: 주당 $${event.amount.toFixed(4)}`
            : "배당 일정 확정"
          : event.amount != null
            ? `Distribution declared: $${event.amount.toFixed(4)} per share`
            : "Distribution schedule confirmed",
      href: null,
    });
  }

  if (riskCalculatedAt) {
    entries.push({
      id: `crady-${riskCalculatedAt}`,
      source: "crady",
      timestamp: riskCalculatedAt,
      label: lang === "ko" ? "CRADY 위험 점수 업데이트" : "CRADY risk score updated",
      href: null,
    });
    entries.push({
      id: `ai-${riskCalculatedAt}`,
      source: "ai",
      timestamp: riskCalculatedAt,
      label: lang === "ko" ? "AI 브리핑 업데이트" : "AI Outlook refreshed",
      href: "#ai-outlook",
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
