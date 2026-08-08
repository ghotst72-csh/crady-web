import { EtfActivityStream } from "./EtfActivityStream";
import { AiOutlook } from "./AiOutlook";
import { InvestorDiscussion } from "./InvestorDiscussion";
import { WeeklyRecap } from "./WeeklyRecap";
import { TodaysActivityCard } from "./TodaysActivityCard";
import {
  getTopLevelItems,
  getRepliesForItems,
  getTickerVoteSummary,
  getActivityCounts,
  getAutomatedActivityItems,
  getMostDiscussedItem,
  getTrendingTopics,
  getWeeklyActivityCounts,
  getTodaysActivitySummaryInputs,
} from "@/lib/activity/data";
import { buildActivityStreamEntries } from "@/lib/activity/stream";
import { buildAiOutlook, buildActivityConfidence, buildWeeklyRecap } from "@/lib/activity/aiOutlook";
import { buildTodaysActivitySummary } from "@/lib/activity/todaysSummary";
import { pickMostDiscussedFallback, pickTrendingFallback } from "@/lib/activity/fallback";
import { buildDiscussionQuestion } from "@/lib/activity/discussionQuestion";

const T = {
  aiOutlookToggle: { en: "Show CRADY AI Outlook", ko: "CRADY AI 브리핑 보기" },
  weeklyRecapToggle: { en: "Show Weekly Recap", ko: "주간 요약 보기" },
} as const;

export type ActivitySectionInput = {
  ticker: string;
  lang?: "en" | "ko";
  providerId: string;
  priceHistory: { trade_date: string; close_price: number | null }[];
  risk: {
    crady_score: number | null;
    risk_level: string | null;
    max_drawdown: number | null;
    volatility_30d: number | null;
    calculated_at: string | null;
  } | null;
  annualYieldPct: number | null;
  dividendTrendPct: number | null;
  latestPaidDistribution: { amount: number; payDate: string } | null;
  prediction: {
    targetPayDate: string | null;
    targetExDate: string | null;
    predictedAmount: number | null;
    confidenceScore: number | null;
    predictionMethod: string | null;
  } | null;
};

function computePriceDeltaPct(history: { close_price: number | null }[]): number | null {
  const closes = history.map((h) => h.close_price).filter((p): p is number => p != null);
  if (closes.length < 2) return null;
  const [prev, last] = [closes[closes.length - 2], closes[closes.length - 1]];
  if (prev === 0) return null;
  return ((last - prev) / prev) * 100;
}

/** The Hero-adjacent "Today's Activity" presence booster (Activity Engine
 * Phase 2) — its own Suspense boundary/call site, positioned directly under
 * EtfHero in page.tsx, deliberately separate from ActivitySection below so
 * it can render (or render nothing) without waiting on the larger
 * stream/AiOutlook fetch. Same try/catch-to-null safety as every other
 * section in this file. */
export async function TodaysActivitySummarySection({
  ticker,
  lang = "en",
  priceHistory,
}: {
  ticker: string;
  lang?: "en" | "ko";
  priceHistory: { trade_date: string; close_price: number | null }[];
}) {
  try {
    return await renderTodaysActivitySummarySection({ ticker, lang, priceHistory });
  } catch {
    return null;
  }
}

async function renderTodaysActivitySummarySection({
  ticker,
  lang,
  priceHistory,
}: {
  ticker: string;
  lang: "en" | "ko";
  priceHistory: { trade_date: string; close_price: number | null }[];
}) {
  const input = await getTodaysActivitySummaryInputs(ticker, lang);
  const summary = buildTodaysActivitySummary(input, computePriceDeltaPct(priceHistory), lang);
  return <TodaysActivityCard summary={summary} lang={lang} />;
}

/** Orchestrator for the two sections that make up the top of the ETF Hub
 * page's activity block — EtfActivityStream, AiOutlook — inserted right
 * after the existing Hero/ProfileSnippet, well before the rest of the
 * page's existing (untouched) financial content. Runs its own Promise.all
 * against the Activity tables, fully separate from the ticker page's
 * existing 12-call fetch.
 *
 * InvestorDiscussion is a *separate* Suspense boundary/call site
 * (InvestorDiscussionSection, below) rather than folded in here, even
 * though it used to be: giving each streamed section its own boundary lets
 * page.tsx place a real, always-present anchor element (id="etf-activity",
 * id="investor-discussion") in the synchronous shell immediately before
 * each one. Next.js's out-of-order streaming swap otherwise leaves a
 * transient `<div hidden id="S:n">` clone of the streamed subtree in the
 * DOM for a few seconds — harmless (inert, invisible, self-removing) but a
 * real duplicate-id if that subtree carries its own id, which a shared
 * boundary around two separately-anchored sections would have forced.
 *
 * Wrapped in try/catch and fails to `null` (renders nothing) rather than
 * throwing: the Activity migration is reviewed-but-manually-applied, per
 * this repo's house convention for schema changes, so there's a real window
 * where this code is deployed before the tables exist yet. A query error
 * here — missing tables today, or a transient Supabase hiccup any day —
 * must never take down the Hero/Prediction/Distribution History content
 * this section sits next to; that existing content is the site's whole SEO
 * value and cannot be put at risk by a new, still-maturing feature. */
export async function ActivitySection(input: ActivitySectionInput) {
  try {
    return await renderActivitySection(input);
  } catch {
    return null;
  }
}

async function renderActivitySection(input: ActivitySectionInput) {
  const { ticker, lang = "en", providerId, priceHistory, risk, annualYieldPct, dividendTrendPct, latestPaidDistribution, prediction } =
    input;

  const [topLevelItems, voteSummary, activityCounts, automatedItems, mostDiscussed, trendingTopics] = await Promise.all([
    getTopLevelItems(ticker),
    getTickerVoteSummary(ticker),
    getActivityCounts(ticker),
    getAutomatedActivityItems(ticker, lang),
    getMostDiscussedItem(ticker),
    getTrendingTopics(ticker, 3),
  ]);
  // "Latest Discussions" reuses the already-fetched topLevelItems — not a
  // second query, per the SEO Authority Phase 2 plan.
  const latestDiscussions = topLevelItems.slice(0, 3);

  const priceDeltaPct = computePriceDeltaPct(priceHistory);
  const riskCalculatedAt = risk?.calculated_at ?? null;

  const streamEntries = buildActivityStreamEntries(
    { ticker, automatedItems, riskCalculatedAt, topLevelItems },
    lang
  );

  // Most Discussed / Trending never show an empty box while there's ANY
  // real content to point to — falls back through official, then CRADY
  // Analysis, before the honest empty state. See lib/activity/fallback.ts.
  const featuredMostDiscussed = pickMostDiscussedFallback(mostDiscussed, automatedItems);
  const featuredTrending = pickTrendingFallback(trendingTopics, automatedItems, 3);

  const confidence = buildActivityConfidence(
    {
      questionCount: activityCounts.questionCount,
      totalComments: activityCounts.totalReplies,
      voteCount: activityCounts.voteCount,
    },
    lang
  );

  const outlook = buildAiOutlook(
    {
      ticker,
      providerId,
      priceDeltaPct,
      riskLevel: risk?.risk_level ?? null,
      cradyScore: risk?.crady_score ?? null,
      maxDrawdownPct: risk?.max_drawdown ?? null,
      volatility30dPct: risk?.volatility_30d ?? null,
      annualYieldPct,
      dividendTrendPct,
      latestPaidDistribution,
      prediction,
      mostDiscussed,
      activitySignals: {
        questionCount: activityCounts.questionCount,
        totalComments: activityCounts.totalReplies,
        voteCount: activityCounts.voteCount,
      },
    },
    lang
  );

  const nextCatalystDate = prediction?.targetExDate ?? prediction?.targetPayDate ?? null;

  return (
    <>
      <EtfActivityStream
        ticker={ticker}
        lang={lang}
        priceDeltaPct={priceDeltaPct}
        voteSummary={voteSummary}
        mostDiscussed={featuredMostDiscussed}
        trendingTopics={featuredTrending}
        latestDiscussions={latestDiscussions}
        nextCatalystDate={nextCatalystDate}
        confidence={confidence}
        streamEntries={streamEntries}
      />
      {/* Community tab spec (subpage unification §5/§8) — AiOutlook is real
          but the most verbose, prose-heavy content on the page; collapsed
          by default so it never outweighs the actual discussion above it.
          Native <details> (not a client toggle) so the content stays fully
          server-rendered and crawlable (§10), and id lives on the <details>
          itself so the Hero's "AI Outlook" Quick Link still auto-expands it
          on fragment navigation in evergreen browsers. */}
      <details id="ai-outlook" className="mt-8 scroll-mt-4 group">
        <summary className="cursor-pointer select-none list-none flex items-center gap-1.5 text-sm font-semibold text-[#92400e]">
          <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▸</span>
          {T.aiOutlookToggle[lang]}
        </summary>
        <div className="mt-3">
          <AiOutlook outlook={outlook} lang={lang} />
        </div>
      </details>
    </>
  );
}

export type InvestorDiscussionSectionInput = {
  ticker: string;
  lang?: "en" | "ko";
  /** Real ETF characteristics already computed on the ticker page — passed
   * through (not re-fetched) purely to pick a per-ETF discussion question
   * (lib/activity/discussionQuestion.ts). None of these are queried here. */
  annualYieldPct: number | null;
  riskLevel: string | null;
  dividendTrendPct: number | null;
  payoutFrequency: string | null;
  nextPredictedExDate: string | null;
};

/** InvestorDiscussion's own Suspense boundary/call site — see the doc
 * comment on ActivitySection above for why this is separate rather than
 * folded back in. Re-fetches topLevelItems independently (a second, cheap
 * indexed query) rather than threading it through from ActivitySection,
 * since the two are now genuinely independent streamed subtrees with no
 * shared parent render to pass it through. */
export async function InvestorDiscussionSection(input: InvestorDiscussionSectionInput) {
  try {
    return await renderInvestorDiscussionSection(input);
  } catch {
    return null;
  }
}

async function renderInvestorDiscussionSection({
  ticker,
  lang = "en",
  annualYieldPct,
  riskLevel,
  dividendTrendPct,
  payoutFrequency,
  nextPredictedExDate,
}: InvestorDiscussionSectionInput) {
  const topLevelItems = await getTopLevelItems(ticker);
  const repliesByParent = await getRepliesForItems(topLevelItems.map((i) => i.id));
  const discussionQuestion = buildDiscussionQuestion(
    { ticker, annualYieldPct, riskLevel, dividendTrendPct, payoutFrequency, nextPredictedExDate },
    lang
  );

  return (
    <InvestorDiscussion
      ticker={ticker}
      lang={lang}
      topLevelItems={topLevelItems}
      repliesByParent={repliesByParent}
      discussionQuestion={discussionQuestion}
    />
  );
}

/** Separate, self-contained fetch for the Weekly Recap card — positioned
 * near the bottom of the page (not in the top three Activity sections), so
 * it's a distinct call site in page.tsx rather than folded into
 * ActivitySection above. Same try/catch-to-null safety as ActivitySection. */
export async function ActivityWeeklyRecap(props: {
  ticker: string;
  lang?: "en" | "ko";
  priceHistory: { trade_date: string; close_price: number | null }[];
  recentDistributions: { pay_date: string; amount: number | null }[];
  nextPredictedExDate?: string | null;
  nextPredictedPayDate?: string | null;
}) {
  try {
    return await renderActivityWeeklyRecap(props);
  } catch {
    return null;
  }
}

async function renderActivityWeeklyRecap({
  ticker,
  lang = "en",
  priceHistory,
  recentDistributions,
  nextPredictedExDate = null,
  nextPredictedPayDate = null,
}: {
  ticker: string;
  lang?: "en" | "ko";
  priceHistory: { trade_date: string; close_price: number | null }[];
  recentDistributions: { pay_date: string; amount: number | null }[];
  nextPredictedExDate?: string | null;
  nextPredictedPayDate?: string | null;
}) {
  const weekly = await getWeeklyActivityCounts(ticker);
  const automatedItems = await getAutomatedActivityItems(ticker, lang, 20);

  // new Date() rather than Date.now() — the latter is flagged as an impure
  // call inside a Server Component's render body by this repo's
  // react-hooks/purity lint rule; matches the existing `todayStr = new
  // Date().toISOString().slice(0, 10)` pattern already used in
  // app/(en)/[ticker]/page.tsx.
  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const sevenDaysAgo = sevenDaysAgoDate.toISOString().slice(0, 10);
  const closesInWindow = priceHistory.filter((h) => h.trade_date >= sevenDaysAgo && h.close_price != null);
  const priceDeltaPct7d =
    closesInWindow.length >= 2
      ? (((closesInWindow[closesInWindow.length - 1].close_price as number) - (closesInWindow[0].close_price as number)) /
          (closesInWindow[0].close_price as number)) *
        100
      : null;

  const paidThisWeek = recentDistributions.filter((d) => d.pay_date >= sevenDaysAgo && d.amount != null);
  const totalPaidAmount7d =
    paidThisWeek.length > 0 ? paidThisWeek.reduce((sum, d) => sum + (d.amount ?? 0), 0) : null;

  const sevenDaysAgoIso = sevenDaysAgoDate.toISOString();
  const forecastChangeHeadlines = automatedItems
    .filter(
      (i) => (i.type === "prediction_change" || i.type === "confidence_change") && i.occurredAt >= sevenDaysAgoIso
    )
    .map((i) => i.body);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextDate = nextPredictedExDate ?? nextPredictedPayDate;
  const upcomingDate =
    nextDate && nextDate >= todayStr
      ? {
          label:
            nextDate === nextPredictedExDate
              ? lang === "ko"
                ? "다음 배당락일"
                : "next ex-dividend date"
              : lang === "ko"
                ? "다음 지급일"
                : "next payment date",
          date: nextDate,
        }
      : null;

  const report = buildWeeklyRecap(
    {
      ticker,
      priceDeltaPct7d,
      distributionsPaid7d: paidThisWeek.length,
      totalPaidAmount7d,
      newQuestions7d: weekly.newQuestions7d,
      newComments7d: weekly.newReplies7d,
      forecastChangeHeadlines,
      upcomingDate,
    },
    lang
  );

  return (
    <details className="mt-4 group">
      <summary className="cursor-pointer select-none list-none flex items-center gap-1.5 text-sm font-semibold text-[#92400e]">
        <span aria-hidden className="inline-block transition-transform group-open:rotate-90">▸</span>
        {T.weeklyRecapToggle[lang]}
      </summary>
      <div className="mt-1">
        <WeeklyRecap report={report} lang={lang} />
      </div>
    </details>
  );
}
