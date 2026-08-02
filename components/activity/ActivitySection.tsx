import { EtfActivityStream } from "./EtfActivityStream";
import { AiOutlook } from "./AiOutlook";
import { InvestorDiscussion } from "./InvestorDiscussion";
import { WeeklyRecap } from "./WeeklyRecap";
import {
  getTopLevelItems,
  getRepliesForItems,
  getTickerVoteSummary,
  getActivityCounts,
  getRecentOfficialEvents,
  getMostDiscussedItem,
  getTrendingTopics,
  getWeeklyActivityCounts,
} from "@/lib/activity/data";
import { buildActivityStreamEntries } from "@/lib/activity/stream";
import { buildAiOutlook, buildActivityConfidence, buildWeeklyRecap } from "@/lib/activity/aiOutlook";

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

/** Orchestrator for the three sections that make up the heart of the ETF
 * Hub page — EtfActivityStream, AiOutlook, InvestorDiscussion — inserted
 * right after the existing Hero/ProfileSnippet, well before the rest of the
 * page's existing (untouched) financial content. Runs its own Promise.all
 * against the Activity tables, fully separate from the ticker page's
 * existing 12-call fetch.
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

  const [topLevelItems, voteSummary, activityCounts, officialEvents, mostDiscussed, trendingTopics] = await Promise.all([
    getTopLevelItems(ticker),
    getTickerVoteSummary(ticker),
    getActivityCounts(ticker),
    getRecentOfficialEvents(ticker),
    getMostDiscussedItem(ticker),
    getTrendingTopics(ticker, 3),
  ]);
  // "Latest Discussions" reuses the already-fetched topLevelItems — not a
  // second query, per the SEO Authority Phase 2 plan.
  const latestDiscussions = topLevelItems.slice(0, 3);

  const repliesByParent = await getRepliesForItems(topLevelItems.map((i) => i.id));

  const priceDeltaPct = computePriceDeltaPct(priceHistory);
  const riskCalculatedAt = risk?.calculated_at ?? null;

  const streamEntries = buildActivityStreamEntries(
    { ticker, officialEvents, riskCalculatedAt, topLevelItems },
    lang
  );

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
        mostDiscussed={mostDiscussed}
        trendingTopics={trendingTopics}
        latestDiscussions={latestDiscussions}
        nextCatalystDate={nextCatalystDate}
        confidence={confidence}
        streamEntries={streamEntries}
      />
      <AiOutlook outlook={outlook} lang={lang} />
      <InvestorDiscussion
        ticker={ticker}
        lang={lang}
        topLevelItems={topLevelItems}
        repliesByParent={repliesByParent}
      />
    </>
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
}: {
  ticker: string;
  lang?: "en" | "ko";
  priceHistory: { trade_date: string; close_price: number | null }[];
  recentDistributions: { pay_date: string; amount: number | null }[];
}) {
  const weekly = await getWeeklyActivityCounts(ticker);

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

  const text = buildWeeklyRecap(
    {
      ticker,
      priceDeltaPct7d,
      distributionsPaid7d: paidThisWeek.length,
      totalPaidAmount7d,
      newQuestions7d: weekly.newQuestions7d,
      newComments7d: weekly.newReplies7d,
    },
    lang
  );

  return <WeeklyRecap text={text} lang={lang} />;
}
