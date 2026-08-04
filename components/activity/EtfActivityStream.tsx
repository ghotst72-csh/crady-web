import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import { Badge } from "@/components/ui/Badge";
import { LazyMount } from "./LazyMount";
import { VoteWidget } from "./InteractiveIslands/VoteWidget";
import type { ActivityItem, ActivityStreamEntry, VoteSummary } from "@/lib/activity/types";
import type { ActivityConfidence } from "@/lib/activity/aiOutlook";
import { activityBadgeLabel, activityBadgeVariant } from "@/lib/activity/badges";
import type { FeaturedTopic } from "@/lib/activity/fallback";
import { ActivityStreamDetailRow } from "./ActivityStreamDetailRow";

// Below this many real votes, a percentage split would overstate confidence
// (e.g. a single voter reading as "100% Bullish") — show the honest
// not-enough-responses state instead. Matches the threshold already used
// for ActivityConfidence's "building" tier (lib/activity/aiOutlook.ts).
const MIN_SENTIMENT_SAMPLE = 5;

const T = {
  heading: { en: "Today's Activity", ko: "오늘의 활동" },
  sentiment: { en: "Sentiment", ko: "투자 심리" },
  notEnoughData: { en: "Not enough data yet", ko: "아직 데이터가 부족합니다" },
  notEnoughResponses: { en: "Not enough responses yet", ko: "아직 응답이 충분하지 않습니다" },
  votes: { en: "votes", ko: "표" },
  mostDiscussed: { en: "Most Discussed", ko: "가장 많이 논의된 주제" },
  nextCatalyst: { en: "Next Catalyst", ko: "다음 이벤트" },
  none: { en: "None scheduled", ko: "예정 없음" },
  activityConfidence: { en: "Activity Confidence", ko: "활동 신뢰도" },
  streamEmpty: { en: "No activity yet today — check back soon.", ko: "오늘은 아직 활동이 없습니다 — 곧 업데이트됩니다." },
  trendingTopics: { en: "Trending Topics", ko: "인기 토픽" },
  trendingEmpty: { en: "No trending topics yet.", ko: "아직 인기 토픽이 없습니다." },
  latestDiscussions: { en: "Latest Discussions", ko: "최신 토론" },
  latestEmpty: { en: "No discussions yet — be the first to ask a question.", ko: "아직 토론이 없습니다 — 첫 질문을 남겨보세요." },
  replies: { en: "replies", ko: "개 답글" },
} as const;

function formatSentiment(votes: VoteSummary, lang: "en" | "ko"): string {
  if (votes.total === 0) return T.notEnoughData[lang];
  if (votes.total < MIN_SENTIMENT_SAMPLE) return `${T.notEnoughResponses[lang]} (${votes.total})`;
  const bullPct = Math.round((votes.bull / votes.total) * 100);
  const bearPct = Math.round((votes.bear / votes.total) * 100);
  return lang === "ko"
    ? `상승 ${bullPct}% · 하락 ${bearPct}% (${votes.total}${T.votes.ko})`
    : `Bull ${bullPct}% · Bear ${bearPct}% (${votes.total} ${T.votes.en})`;
}

function formatTimestamp(iso: string, lang: "en" | "ko"): string {
  // A bare date (declaration_date) vs. a full timestamp both need to render
  // sensibly — show a time only when one is actually present.
  const hasTime = iso.includes("T");
  if (!hasTime) return iso;
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

/** "Today's Activity" — the heart of the ETF Hub page, merging what would
 * otherwise be four separate boxes (sentiment pulse, official updates,
 * today's deltas, a community timeline) into one compact stat strip plus one
 * unified chronological stream, source-tagged per entry. Server-rendered:
 * every entry here is real HTML in the initial response — only the vote tap
 * control (VoteWidget, wrapped in LazyMount below) is client-only. */
export function EtfActivityStream({
  ticker,
  lang = "en",
  priceDeltaPct,
  voteSummary,
  mostDiscussed,
  nextCatalystDate,
  confidence,
  streamEntries,
  trendingTopics = [],
  latestDiscussions = [],
}: {
  ticker: string;
  lang?: "en" | "ko";
  priceDeltaPct: number | null;
  voteSummary: VoteSummary;
  /** Activity Engine Phase 2: real investor topic if one exists, else the
   * most recent real Official/CRADY Analysis item — see
   * lib/activity/fallback.ts. Still never fabricated; `null` only once
   * every real tier is exhausted. */
  mostDiscussed: FeaturedTopic | null;
  nextCatalystDate: string | null;
  confidence: ActivityConfidence;
  streamEntries: ActivityStreamEntry[];
  /** Real investor topics padded out with recent Official/CRADY items when
   * there aren't enough (lib/activity/fallback.ts) — an empty array (no
   * real content anywhere) renders the honest "No trending topics yet"
   * state. */
  trendingTopics?: FeaturedTopic[];
  /** The same getTopLevelItems(ticker, 3) result InvestorDiscussion uses
   * for its full board, just previewed here — not a second query. */
  latestDiscussions?: ActivityItem[];
}) {
  const statItems: KpiItem[] = [
    {
      label: lang === "ko" ? "가격 변동" : "Price Move",
      value: priceDeltaPct != null ? `${priceDeltaPct >= 0 ? "+" : ""}${priceDeltaPct.toFixed(1)}%` : "—",
      accent: priceDeltaPct != null && priceDeltaPct >= 0,
    },
    { label: T.sentiment[lang], value: formatSentiment(voteSummary, lang) },
    {
      label: T.mostDiscussed[lang],
      value: mostDiscussed
        ? mostDiscussed.title.length > 28
          ? `${mostDiscussed.title.slice(0, 28)}…`
          : mostDiscussed.title
        : T.notEnoughData[lang],
      size: "sm",
    },
    { label: T.nextCatalyst[lang], value: nextCatalystDate ?? T.none[lang] },
    { label: T.activityConfidence[lang], value: confidence.label },
  ];

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-3">
        {ticker} {T.heading[lang]}
      </h2>

      <KpiGrid items={statItems} columns={3} />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
          {T.sentiment[lang]}
        </span>
        <LazyMount minHeight={30}>
          <VoteWidget ticker={ticker} lang={lang} />
        </LazyMount>
      </div>

      <div className="mt-4 border border-[var(--gray-200)] rounded-xl divide-y divide-[var(--gray-100)]">
        {streamEntries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-[var(--gray-400)]">{T.streamEmpty[lang]}</p>
        ) : (
          streamEntries.map((entry) =>
            entry.detail ? (
              <ActivityStreamDetailRow key={entry.id} entry={entry} lang={lang} />
            ) : (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs text-[var(--gray-500)] tabular-nums w-12 shrink-0">
                  {formatTimestamp(entry.timestamp, lang)}
                </span>
                <Badge variant={activityBadgeVariant(entry.source)} className="shrink-0">
                  {activityBadgeLabel(entry.source, lang)}
                </Badge>
                {entry.href ? (
                  <a href={entry.href} className="min-w-0 flex-1 text-sm text-[var(--gray-700)] hover:text-black hover:underline truncate">
                    {entry.label}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 text-sm text-[var(--gray-700)] truncate">{entry.label}</span>
                )}
              </div>
            )
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-[var(--gray-200)] rounded-xl p-4 min-w-0">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.trendingTopics[lang]}
          </div>
          {trendingTopics.length === 0 ? (
            <p className="text-sm text-[var(--gray-400)]">{T.trendingEmpty[lang]}</p>
          ) : (
            <ul className="space-y-1.5">
              {trendingTopics.map((topic, i) => (
                <li key={`${topic.kind}-${i}`} className="text-sm flex items-center gap-1.5">
                  {topic.kind !== "investor-discussion" && (
                    <Badge variant={topic.kind === "official" ? "blue" : "accent"} className="shrink-0">
                      {activityBadgeLabel(topic.kind === "official" ? "official" : "crady", lang)}
                    </Badge>
                  )}
                  {/* min-w-0 — a flex item's implicit min-width is auto (its
                      content's intrinsic width), not 0, so `truncate` alone
                      does nothing here; without this the <a> refuses to
                      shrink and stretches the whole grid track past the
                      viewport on mobile. Same root cause documented in
                      app/(en)/layout.tsx re: the mobile carousel. */}
                  <a href={topic.href} className="min-w-0 flex-1 text-[var(--gray-700)] hover:text-black hover:underline truncate">
                    {topic.title}
                  </a>
                  {topic.replyCount != null && (
                    <span className="text-[var(--gray-400)] shrink-0"> · {topic.replyCount} {T.replies[lang]}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border border-[var(--gray-200)] rounded-xl p-4 min-w-0">
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-2">
            {T.latestDiscussions[lang]}
          </div>
          {latestDiscussions.length === 0 ? (
            <p className="text-sm text-[var(--gray-400)]">{T.latestEmpty[lang]}</p>
          ) : (
            <ul className="space-y-1.5">
              {latestDiscussions.map((item) => (
                <li key={item.id} className="text-sm">
                  <a href={`#activity-item-${item.id}`} className="text-[var(--gray-700)] hover:text-black hover:underline truncate block">
                    {item.title ?? item.body.slice(0, 60)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
