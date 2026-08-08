import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getAllTickers,
  getEtf,
  getRiskMetrics,
  getRegimeProfile,
  getLatestPrice,
  getPriceHistory,
  getDistributions,
  getDistributionsSince,
  getNextPrediction,
  getSameProviderEtfs,
  getHomeSnapshot,
  computeRunRateAnnualYieldPct,
  providerLabel,
} from "@/lib/data";
import { buildPriceSummary } from "@/lib/ticker/priceSummary";
import {
  getFullNextPrediction,
  getNextScheduleRow,
  getRecentDeclaredDistributions,
} from "@/lib/ticker/nextDividendData";
import { buildNextDividendIntelligenceData } from "@/lib/ticker/buildNextDividendIntelligenceData";
import { NextDividendIntelligence } from "@/components/ticker/NextDividendIntelligence";
import { buildNextDividendDirectAnswer } from "@/lib/ticker/nextDividendNarrative";
import { RESERVED_PATHS } from "@/lib/reserved";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { EtfIdentityHeader } from "@/components/etf/EtfIdentityHeader";
import { EtfWorkspaceTabs } from "@/components/etf/EtfWorkspaceTabs";
import { NextDividendPanel } from "@/components/etf/NextDividendPanel";
import { CommunityPredictionConsensus } from "@/components/etf/CommunityPredictionConsensus";
import { DividendStagePill } from "@/components/DividendLifecycle";
import { EtfAppCta } from "@/components/EtfAppCta";
import { DividendPriceChart } from "@/components/ticker/DividendPriceChart";
import { PredictionTrackRecord } from "@/components/ticker/PredictionTrackRecord";
import { EtfSummaryMetrics } from "@/components/ticker/EtfSummaryMetrics";
import { DistributionStatsPanel } from "@/components/ticker/DistributionStatsPanel";
import { computeAllTimeDistributionStats } from "@/lib/ticker/distributionStats";
import { articleSlug } from "@/lib/magazine/recipes";
import { pickComparisonPeerTicker, pickComparisonPeerTickers } from "@/lib/magazine/comparison";
import { getComparisonPeersData } from "@/lib/magazine/data";
import { ARTICLE_TYPE_LABEL, type ArticleTypeId } from "@/lib/magazine/types";
import {
  getLatestOfficialDistributionForTicker,
  getPredictionVsOfficial,
  getEvaluatedPredictionHistory,
} from "@/lib/distributions/data";
import { OfficialDistributionBlock } from "@/components/distributions/OfficialDistributionBlock";
import { computeDividendTrend } from "@/lib/magazine/trend";
import { buildProfileSnippet, buildProfileFaqItems } from "@/lib/ticker/profileSeo";
import { buildDirectAnswer } from "@/lib/ticker/directAnswer";
import {
  buildWhyInvestorsBuy,
  buildBiggestRisks,
  buildWhoShouldAvoid,
  buildHistoricalCharacteristics,
  type EnrichmentInput,
} from "@/lib/ticker/enrichment";
import { ProfileSnippet, ProfileFaq } from "@/components/ticker/ProfileSeoBlock";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/magazine/jsonld";
import {
  ActivitySection,
  InvestorDiscussionSection,
  TodaysActivitySummarySection,
  ActivityWeeklyRecap,
} from "@/components/activity/ActivitySection";
import { getActivityCounts } from "@/lib/activity/data";
import { getRelevantGuidesForEtf, GUIDE_LABELS } from "@/lib/magazine/topicalLinks";
import { RelatedContent } from "@/components/RelatedContent";
import { PageTrustFooter } from "@/components/seo/PageTrustFooter";
import { getUnderlyingMomentum } from "@/lib/ticker/underlyingMomentum";
import { computeScoreBreakdown } from "@/lib/ticker/scoreExplain";
import { buildRiskContext } from "@/lib/ticker/riskExplain";
import { buildYieldExplanation } from "@/lib/ticker/yieldExplain";
import { buildScenarios } from "@/lib/ticker/scenarios";
import { buildEtfDna } from "@/lib/ticker/dna";
import { computeLifecycleStage } from "@/lib/ticker/lifecycleStage";
import { buildDailySummary } from "@/lib/ticker/aiSummary";
import { YieldExplainer } from "@/components/ticker/YieldExplainer";
import { RiskExplainer } from "@/components/ticker/RiskExplainer";
import { ScoreBreakdown } from "@/components/ticker/ScoreBreakdown";
import { ScenarioCards } from "@/components/ticker/ScenarioCards";
import { EtfDnaCard } from "@/components/ticker/EtfDnaCard";
import { EtfLifecycleTimeline } from "@/components/ticker/EtfLifecycleTimeline";
import { ForecastHistoryTimeline } from "@/components/ticker/ForecastHistoryTimeline";
import { AiDailySummary } from "@/components/ticker/AiDailySummary";
import { EtfCard } from "@/components/etf/EtfCard";
import { comparisonPeerToCardData } from "@/lib/etf/toCardData";

export const revalidate = 3600;

/** The honest "nothing to predict yet" state for NextDividendPanel — never
 * a fabricated placeholder amount, just every field null. */
const EMPTY_NEXT_DIVIDEND = {
  amount: null,
  isOfficial: false,
  confidence: null,
  announcementDate: null,
  exDate: null,
  payDate: null,
  previousAmount: null,
  changeFromLastPct: null,
  whyTab: null,
} as const;

type Params = { ticker: string };

export async function generateStaticParams() {
  const tickers = await getAllTickers();
  return tickers.map((t) => ({ ticker: t.ticker.toLowerCase() }));
}

async function loadTicker(rawTicker: string) {
  if (RESERVED_PATHS.has(rawTicker.toLowerCase())) return null;
  const ticker = rawTicker.toUpperCase();
  const etf = await getEtf(ticker);
  if (!etf) return null;
  return { ticker, etf };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { ticker: rawTicker } = await params;
  const found = await loadTicker(rawTicker);
  if (!found) return {};

  const { ticker, etf } = found;

  const [risk, price, recentDistributions] = await Promise.all([
    getRiskMetrics(ticker),
    getLatestPrice(ticker),
    getDistributionsSince(ticker, 90),
  ]);
  const yieldPct = computeRunRateAnnualYieldPct(recentDistributions, price?.close_price ?? null);

  const title = `${ticker} — ${etf.name ?? ticker} Dividend Info`;
  const description = [
    `${ticker} (${providerLabel(etf.provider_id)}) high dividend ETF.`,
    yieldPct != null ? `Annualized distribution yield ${yieldPct.toFixed(1)}%.` : null,
    risk?.crady_score != null ? `CRADY Score ${risk.crady_score.toFixed(1)}.` : null,
    "See its dividend schedule, estimated next payment, and risk profile.",
  ]
    .filter(Boolean)
    .join(" ");

  const url = `https://crady.net/${ticker.toLowerCase()}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: url,
        ko: `https://crady.net/ko/${ticker.toLowerCase()}`,
        "x-default": url,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "en_US",
      alternateLocale: "ko_KR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ticker: rawTicker } = await params;

  // Case normalization — permanent redirect to lowercase.
  if (rawTicker !== rawTicker.toLowerCase()) {
    permanentRedirect(`/${rawTicker.toLowerCase()}`);
  }

  const found = await loadTicker(rawTicker);
  if (!found) notFound();
  const { ticker, etf } = found;

  const [
    risk,
    regime,
    price,
    history,
    distributions,
    recentDistributions,
    yearOfDistributions,
    allDistributions,
    rawPrediction,
    siblings,
    allTickers,
    officialDistribution,
    predictionVsOfficial,
    homeSnapshot,
    fullNextPrediction,
    nextScheduleRow,
    recentDeclaredDistributions,
    evaluatedPredictionHistory,
    activityCounts,
  ] = await Promise.all([
    getRiskMetrics(ticker),
    getRegimeProfile(ticker),
    getLatestPrice(ticker),
    // 260 trading days (~1Y) — enough for the Hero's 1W/1M/3M sparkline
    // windows *and* the 52-week high/low range (ETF Detail Page v3),
    // still comfortably under PostgREST's row cap.
    getPriceHistory(ticker, 260),
    getDistributions(ticker, 12),
    getDistributionsSince(ticker, 90),
    getDistributionsSince(ticker, 395),
    // CRADY Phase 3 — History tab's "ALL" stats + full table (spec §5):
    // a generously long window (any currently-tracked ETF's real full
    // history fits comfortably inside ~5.5 years), not a synthetic
    // unbounded query. Same function as the other distributions fetches
    // above, just a longer window.
    getDistributionsSince(ticker, 2000),
    getNextPrediction(ticker),
    getSameProviderEtfs(etf.provider_id, ticker),
    getAllTickers(),
    getLatestOfficialDistributionForTicker(ticker),
    getPredictionVsOfficial(ticker),
    getHomeSnapshot(),
    getFullNextPrediction(ticker),
    getNextScheduleRow(ticker),
    getRecentDeclaredDistributions(ticker, 12),
    getEvaluatedPredictionHistory(ticker, 20),
    // CRADY ETF Detail UI — the real discussion count for the Community
    // tab badge (spec: the "327" number next to Community in the tab
    // bar). Wrapped so a missing/erroring Activity table (schema is
    // reviewed-but-manually-applied, per this repo's convention) never
    // breaks the rest of the page — same safety as ActivitySection.
    getActivityCounts(ticker).catch(() => ({ questionCount: 0, totalReplies: 0, voteCount: 0 })),
  ]);
  const communityCount = activityCounts.questionCount + activityCounts.totalReplies;
  const dividendTrendWindows = computeDividendTrend(yearOfDistributions);
  const trend12mo = dividendTrendWindows.find((w) => w.days === 365) ?? null;
  const window3m = dividendTrendWindows.find((w) => w.days === 90)!;
  const window6m = dividendTrendWindows.find((w) => w.days === 180)!;
  const window12m = dividendTrendWindows.find((w) => w.days === 365)!;
  const allTimeStats = computeAllTimeDistributionStats(
    allDistributions.map((d) => ({ pay_date: d.pay_date, amount: d.amount }))
  );

  // Intelligence 4.0 — real underlying-stock volatility, fetched only when
  // this ETF actually tracks one (risk.underlying_ticker). A follow-up
  // await rather than part of the main Promise.all since it depends on
  // risk's own result, same pattern already used below for similarEtfs.
  const underlyingMomentum = risk?.underlying_ticker ? await getUnderlyingMomentum(risk.underlying_ticker) : null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const prediction =
    rawPrediction && rawPrediction.target_pay_date && rawPrediction.target_pay_date >= todayStr
      ? rawPrediction
      : null;

  const annualYieldPct = computeRunRateAnnualYieldPct(
    recentDistributions,
    price?.close_price ?? null
  );
  const latestPaidDistribution = distributions.find((d) => d.amount != null);

  // ETF Detail Page v3 — Investor Dashboard Redesign. Derived purely from
  // data already fetched above (history) — see lib/ticker/priceSummary.ts.
  const priceSummary = buildPriceSummary(history);

  const comparisonPeerTicker = pickComparisonPeerTicker(ticker, etf.provider_id, allTickers);
  const MAGAZINE_TYPES: ArticleTypeId[] = [
    "next-dividend-prediction",
    "dividend-guide",
    "dividend-calendar",
    "dividend-history",
    "risk-analysis",
  ];

  // SEO Authority Phase 2 — "Similar ETFs": a real, data-driven peer
  // comparison, upgrading the existing sibling-chip list. Uses the
  // already-built-but-previously-unused pickComparisonPeerTickers/
  // getComparisonPeersData pair (see lib/magazine/comparison.ts,
  // lib/magazine/data.ts) — no new query pattern.
  const similarEtfTickers = pickComparisonPeerTickers(ticker, etf.provider_id, allTickers, 4);
  const similarEtfs = similarEtfTickers.length > 0 ? await getComparisonPeersData(similarEtfTickers) : [];

  const enrichmentInput: EnrichmentInput = {
    ticker,
    providerId: etf.provider_id,
    investmentStrategy: isKnown(etf.investment_strategy)
      ? etf.investment_strategy
      : isKnown(etf.long_description)
        ? etf.long_description
        : null,
    annualYieldPct,
    payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
    riskLevel: risk?.risk_level ?? null,
    maxDrawdownPct: risk?.max_drawdown ?? null,
    volatility90dPct: risk?.volatility_90d ?? null,
    dividendStabilityScore: risk?.dividend_stability_score ?? null,
    trend12mo: trend12mo
      ? {
          avgChangePct: trend12mo.avgChangePct,
          increases: trend12mo.increases,
          decreases: trend12mo.decreases,
          count: trend12mo.count,
        }
      : null,
  };
  const whyInvestorsBuy = buildWhyInvestorsBuy(enrichmentInput, "en");
  const biggestRisks = buildBiggestRisks(enrichmentInput, isKnown(etf.risk_summary) ? etf.risk_summary : null, "en");
  const whoShouldAvoid = buildWhoShouldAvoid(enrichmentInput, "en");
  const historicalCharacteristics = buildHistoricalCharacteristics(enrichmentInput, "en");

  const directAnswer = buildDirectAnswer(
    {
      ticker,
      providerId: etf.provider_id,
      payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
      annualYieldPct,
      prediction: prediction
        ? { targetPayDate: prediction.target_pay_date, predictedAmount: prediction.predicted_amount }
        : null,
      latestPaidDistribution:
        latestPaidDistribution?.amount != null
          ? { amount: latestPaidDistribution.amount, payDate: latestPaidDistribution.pay_date }
          : null,
    },
    "en"
  );

  // CRADY Engagement & Intelligence Phase 2, Part A — Next Dividend
  // Intelligence. All inputs are data already fetched above (no new
  // queries beyond the 4 added to the Promise.all).
  const todayStr2 = new Date().toISOString().slice(0, 10);
  const nextDividendIntelligenceData = buildNextDividendIntelligenceData({
    ticker,
    scheduleRow: nextScheduleRow,
    prediction: fullNextPrediction,
    recentDeclared: recentDeclaredDistributions,
    evaluatedHistory: evaluatedPredictionHistory,
    latestEvaluated: predictionVsOfficial,
    strategyType: risk?.strategy_type ?? null,
    underlyingTicker: risk?.underlying_ticker ?? null,
    assetClass: isKnown(etf.asset_class) ? etf.asset_class : null,
    volatility30d: risk?.volatility_30d ?? null,
    payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
    todayIso: todayStr2,
    lang: "en",
    underlyingVolatility30d: underlyingMomentum?.volatility_30d ?? null,
  });
  // Phase 2/3 — Summary's "Next Dividend Prediction" reuses the exact same
  // fields the Next Dividend tab renders (never a second, independently-
  // fetched prediction that could show a different number).
  const heroAmount = nextDividendIntelligenceData.isOfficial
    ? nextDividendIntelligenceData.officialAmount
    : nextDividendIntelligenceData.pointEstimate;
  const nextDividendHero =
    heroAmount != null
      ? {
          amount: heroAmount,
          isOfficial: nextDividendIntelligenceData.isOfficial,
          confidence: nextDividendIntelligenceData.confidence,
          announcementDate: nextDividendIntelligenceData.schedule.declaration.date,
          exDate: nextDividendIntelligenceData.schedule.exDividend.date,
          payDate: nextDividendIntelligenceData.schedule.payment.date,
          previousAmount: nextDividendIntelligenceData.previousAmount,
          changeFromLastPct:
            nextDividendIntelligenceData.previousAmount != null && nextDividendIntelligenceData.previousAmount > 0
              ? ((heroAmount - nextDividendIntelligenceData.previousAmount) / nextDividendIntelligenceData.previousAmount) * 100
              : null,
          whyTab: "next-dividend",
        }
      : null;

  const nextDividendDirectAnswer = buildNextDividendDirectAnswer(
    {
      ticker,
      exDate: nextDividendIntelligenceData.schedule.exDividend.date,
      pointEstimate: nextDividendIntelligenceData.pointEstimate,
      isOfficial: nextDividendIntelligenceData.isOfficial,
      officialAmount: nextDividendIntelligenceData.officialAmount,
      payDate: nextDividendIntelligenceData.schedule.payment.date,
    },
    "en"
  );

  // CRADY Intelligence 4.0 — rule-based "why" explanations, all real,
  // all derived from data already fetched above (+ underlyingMomentum,
  // the one new follow-up fetch). Never an LLM call.
  const ownSnapshot = homeSnapshot.find((s) => s.ticker === ticker);
  const scoreBreakdown = computeScoreBreakdown({
    cradyScore: risk?.crady_score ?? null,
    riskLevel: risk?.risk_level ?? null,
    dividendStabilityScore: risk?.dividend_stability_score ?? null,
    recoveryScore: risk?.recovery_score ?? null,
    maxDrawdown: risk?.max_drawdown ?? null,
    volatility30d: risk?.volatility_30d ?? null,
    trendScore: risk?.trend_score ?? null,
    momentumScore: risk?.momentum_score ?? null,
  });
  const riskContext = buildRiskContext({
    riskLevel: risk?.risk_level ?? null,
    volatility30d: risk?.volatility_30d ?? null,
    volatility90d: risk?.volatility_90d ?? null,
    maxDrawdown: risk?.max_drawdown ?? null,
    dividendStabilityScore: risk?.dividend_stability_score ?? null,
  });
  const yieldExplanation = buildYieldExplanation(
    {
      annualYieldPct,
      payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
      dividendTrend: ownSnapshot?.dividendTrend ?? null,
      dividendTrendPct: ownSnapshot?.dividendTrendPct ?? null,
      recentReturn30d: risk?.recent_return_30d ?? null,
    },
    "en"
  );
  const dnaTraits = buildEtfDna({
    incomeScore: risk?.income_score ?? null,
    momentumScore: risk?.momentum_score ?? null,
    riskLevel: risk?.risk_level ?? null,
    recoveryScore: risk?.recovery_score ?? null,
    dividendStabilityScore: risk?.dividend_stability_score ?? null,
    safetyScore: risk?.safety_score ?? null,
    trendScore: risk?.trend_score ?? null,
  });
  const scenarios = buildScenarios({
    pointEstimate: nextDividendIntelligenceData.pointEstimate,
    recentAmounts: nextDividendIntelligenceData.recentAmounts,
  });
  const lifecycleStage = computeLifecycleStage({
    cycleDeclarationDate: nextDividendIntelligenceData.schedule.declaration.date,
    cycleExDate: nextDividendIntelligenceData.schedule.exDividend.date,
    cyclePayDate: nextDividendIntelligenceData.schedule.payment.date,
    hasNextCyclePrediction: nextDividendIntelligenceData.pointEstimate != null,
    lastCycleEvaluated: predictionVsOfficial != null,
  });
  const aiSummarySentences = buildDailySummary(
    { ticker, directAnswer, notes: risk?.notes ?? null, yieldExplanation, scoreBreakdown, riskContext },
    "en"
  );

  // "Related Guides" — bidirectional topical-authority linking (SEO
  // Authority Phase 2): every ETF page links out to the subset of pillar
  // guides genuinely relevant to it.
  const relevantGuides = getRelevantGuidesForEtf(etf, isKnown(etf.payout_frequency) ? etf.payout_frequency : null);
  const guideLinks = relevantGuides.map((slug) => ({ href: `/magazine/${slug}`, label: GUIDE_LABELS[slug] }));
  const articleLinks = MAGAZINE_TYPES.map((type) => ({
    href: `/magazine/${articleSlug(ticker, type)}`,
    label: `${ticker} ${ARTICLE_TYPE_LABEL[type]}`,
  }));
  if (comparisonPeerTicker) {
    articleLinks.push({
      href: `/magazine/${articleSlug(ticker, "comparison")}`,
      label: `${ticker} vs ${comparisonPeerTicker}`,
    });
  }
  const etfLinks = similarEtfs.map((peer) => ({ href: `/${peer.ticker.toLowerCase()}`, label: `Compare with ${peer.ticker}` }));
  const rankingLinks = [
    { href: "/ranking", label: "Full ETF Ranking" },
    { href: "/calendar", label: "Dividend Calendar" },
    { href: "/distributions", label: "Official Distribution Center" },
  ];

  const financialProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: etf.name ?? ticker,
    inLanguage: "en",
    tickerSymbol: ticker,
    provider: { "@type": "Organization", name: providerLabel(etf.provider_id) },
    category: isKnown(etf.category) ? etf.category : undefined,
    url: `https://crady.net/${ticker.toLowerCase()}`,
    ...(price?.close_price != null
      ? {
          offers: {
            "@type": "Offer",
            price: price.close_price,
            priceCurrency: "USD",
          },
        }
      : {}),
  };

  // AI Overview Optimization Phase 1 — the profile page is the shortest,
  // most-linked URL per ticker, but previously had no self-contained
  // snippet, FAQ, or FAQPage/Speakable structured data (unlike the Magazine
  // article system). Built from data already fetched above, no new query.
  const profileSeoInput = {
    ticker,
    name: etf.name,
    providerId: etf.provider_id,
    category: isKnown(etf.category) ? etf.category : null,
    riskLevel: risk?.risk_level ?? null,
    cradyScore: risk?.crady_score ?? null,
    payoutFrequency: isKnown(etf.payout_frequency) ? etf.payout_frequency : null,
    annualYieldPct,
    prediction: prediction
      ? { targetPayDate: prediction.target_pay_date, predictedAmount: prediction.predicted_amount }
      : null,
    latestPaidDistribution:
      latestPaidDistribution?.amount != null
        ? { amount: latestPaidDistribution.amount, payDate: latestPaidDistribution.pay_date }
        : null,
  };
  const profileSnippetText = buildProfileSnippet(profileSeoInput, "en");
  const profileFaqItems = buildProfileFaqItems(profileSeoInput, "en");
  const faqJsonLd = buildFaqJsonLd(profileFaqItems);
  const webPageJsonLd = buildWebPageJsonLd({
    name: `${ticker} — ${etf.name ?? ticker}`,
    description: profileSnippetText,
    url: `https://crady.net/${ticker.toLowerCase()}`,
    speakableSelectors: ["#profile-snippet"],
  });

  const distributions12mTotal = window12m.avg != null ? window12m.avg * window12m.count : null;

  return (
    <div className="pb-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net" },
          { name: ticker, url: `https://crady.net/${ticker.toLowerCase()}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(financialProductJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* CRADY ETF Detail UI (reference-locked) — persistent ETF identity,
          stable across every tab switch. */}
      <EtfIdentityHeader
        ticker={ticker}
        name={etf.name}
        providerId={etf.provider_id}
        payoutFrequency={isKnown(etf.payout_frequency) ? etf.payout_frequency : null}
        sourceUrl={isKnown(etf.source_url) ? etf.source_url : null}
        currentPrice={priceSummary.currentPrice}
        todayChangePct={priceSummary.todayChangePct}
        todayChangeAbs={priceSummary.todayChangeAbs}
        asOfDate={priceSummary.asOfDate}
        lang="en"
      />

      <div id="etf-workspace" className="mt-2 scroll-mt-14">
        <EtfWorkspaceTabs lang="en" communityCount={communityCount} />

        {/* ================= SUMMARY (default tab) ================= */}
        <div id="etf-tab-summary">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
            <NextDividendPanel data={nextDividendHero ?? EMPTY_NEXT_DIVIDEND} lang="en" />

            <div className="mt-6">
              <DividendPriceChart
                history={history}
                distributions={yearOfDistributions.map((d) => ({ pay_date: d.pay_date, amount: d.amount }))}
                latestDistribution={
                  latestPaidDistribution?.amount != null
                    ? { amount: latestPaidDistribution.amount, payDate: latestPaidDistribution.pay_date }
                    : null
                }
                annualYieldPct={annualYieldPct}
                maxDrawdownPct={risk?.max_drawdown ?? null}
                lang="en"
                showMetrics={false}
              />
            </div>

            <div className="mt-6">
              <EtfSummaryMetrics
                annualYieldPct={annualYieldPct}
                distributions12mTotal={distributions12mTotal}
                payoutFrequency={etf.payout_frequency}
                cradyScore={risk?.crady_score ?? null}
                dividendStabilityScore={risk?.dividend_stability_score ?? null}
                expenseRatio={isKnown(etf.expense_ratio) ? etf.expense_ratio : null}
                lang="en"
              />
            </div>
          </div>
        </div>

        {/* ================= NEXT DIVIDEND ================= */}
        <div id="etf-tab-next-dividend" className="hidden">
          <NextDividendIntelligence data={nextDividendIntelligenceData} directAnswer={nextDividendDirectAnswer} lang="en" basePath="" />

          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <ScenarioCards scenarios={scenarios} lang="en" />
              <EtfLifecycleTimeline stage={lifecycleStage} lang="en" />
            </div>

            <PredictionTrackRecord
              trackRecord={nextDividendIntelligenceData.trackRecord}
              rows={evaluatedPredictionHistory}
              lang="en"
            />

            <OfficialDistributionBlock official={officialDistribution} predictionComparison={null} lang="en" />
          </div>
        </div>

        {/* ================= HISTORY ================= */}
        <div id="etf-tab-history" className="hidden">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-5">
            <DividendPriceChart
              history={history}
              distributions={allDistributions.map((d) => ({ pay_date: d.pay_date, amount: d.amount }))}
              latestDistribution={
                latestPaidDistribution?.amount != null
                  ? { amount: latestPaidDistribution.amount, payDate: latestPaidDistribution.pay_date }
                  : null
              }
              annualYieldPct={annualYieldPct}
              maxDrawdownPct={risk?.max_drawdown ?? null}
              lang="en"
            />

            <div className="mt-8">
              <DistributionStatsPanel window3m={window3m} window6m={window6m} window12m={window12m} allTime={allTimeStats} lang="en" />
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3">Full Distribution History</h2>
              <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
                <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Ex-Date</th>
                        <th className="text-left px-4 py-2.5 font-medium">Pay Date</th>
                        <th className="text-right px-4 py-2.5 font-medium">Amount</th>
                        <th className="text-right px-4 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--gray-100)]">
                      {allDistributions.map((d, i) => {
                        const prior = allDistributions[i + 1]?.amount ?? null;
                        const delta = d.amount != null && prior != null ? d.amount - prior : null;
                        return (
                          <tr
                            key={`${d.ex_date}-${i}`}
                            className={`hover:bg-[var(--gray-100)]/60 transition-colors ${i % 2 === 1 ? "bg-[var(--gray-50)]/50" : ""}`}
                          >
                            <td className="px-4 py-2.5 text-[var(--gray-600)]">{d.ex_date}</td>
                            <td className="px-4 py-2.5 text-[var(--gray-600)]">{d.pay_date}</td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                              <span
                                className={
                                  delta != null && delta > 0
                                    ? "text-emerald-700"
                                    : delta != null && delta < 0
                                      ? "text-red-700"
                                      : ""
                                }
                              >
                                {d.amount != null ? `$${d.amount.toFixed(4)}` : "TBD"}
                                {delta != null && delta !== 0 && (
                                  <span className="ml-1 text-xs">{delta > 0 ? "▲" : "▼"}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} lang="en" />
                            </td>
                          </tr>
                        );
                      })}
                      {allDistributions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-[var(--gray-400)]">
                            No dividend history available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= ANALYSIS ================= */}
        <div id="etf-tab-analysis" className="hidden">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-5 space-y-4">
            <AiDailySummary sentences={aiSummarySentences} lang="en" />
            <div className="grid sm:grid-cols-2 gap-4">
              <YieldExplainer explanation={yieldExplanation} lang="en" />
              <RiskExplainer context={riskContext} lang="en" />
            </div>
            <ScoreBreakdown breakdown={scoreBreakdown} lang="en" />
            <EtfDnaCard traits={dnaTraits} lang="en" />
            <ForecastHistoryTimeline rows={evaluatedPredictionHistory} lang="en" />
          </div>

          <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8">
            <div>
              <h2 className="text-lg font-bold mb-3">Provider</h2>
              <div className="border border-[var(--gray-200)] rounded-xl p-4">
                <div className="font-semibold">{providerLabel(etf.provider_id)}</div>
                {siblings.length > 0 && (
                  <>
                    <div className="text-xs text-[var(--gray-500)] mt-3 mb-2">
                      Other {providerLabel(etf.provider_id)} ETFs
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {siblings.map((s) => (
                        <Link
                          key={s.ticker}
                          href={`/${s.ticker.toLowerCase()}`}
                          className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
                        >
                          {s.ticker}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold mb-3">Fund Details</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DetailField
                  label="Payout Frequency"
                  value={isKnown(etf.payout_frequency) ? etf.payout_frequency! : "—"}
                />
                <DetailField label="Category" value={isKnown(etf.category) ? etf.category! : "—"} />
                <DetailField
                  label="Expense Ratio"
                  value={isKnown(etf.expense_ratio) ? etf.expense_ratio! : "—"}
                />
                <DetailField label="AUM" value={isKnown(etf.aum) ? etf.aum! : "—"} />
                {isKnown(etf.inception_date) && <DetailField label="Inception Date" value={etf.inception_date!} />}
                {etf.holdings_count != null && (
                  <DetailField label="Holdings" value={String(etf.holdings_count)} />
                )}
              </div>

              {(etf.investment_strategy || etf.long_description || etf.short_description) && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">
                    Investment Strategy
                  </div>
                  <p className="text-[var(--gray-700)] text-sm leading-relaxed whitespace-pre-line">
                    {etf.investment_strategy || etf.long_description || etf.short_description}
                  </p>
                  {etf.benchmark && (
                    <p className="text-sm text-[var(--gray-500)] mt-2">
                      Underlying / Benchmark: {etf.benchmark}
                    </p>
                  )}
                </div>
              )}

              {regime?.description && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">
                    Market Regime Analysis
                  </div>
                  <p className="text-sm text-[var(--gray-700)]">{regime.description}</p>
                </div>
              )}

              {isKnown(etf.source_url) && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">Official Issuer Resources</div>
                  <a
                    href={etf.source_url!}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm text-[#92400e] underline hover:text-black"
                  >
                    {ticker} official fund page →
                  </a>
                </div>
              )}
            </div>

            {/* SEO Authority Phase 2 — ETF detail page enrichment. All copy is
                templated from real, already-fetched numbers (annualYieldPct,
                risk metrics, trend12mo, etf.risk_summary) — see
                lib/ticker/enrichment.ts. Any section without enough real data
                to say something honest is simply omitted, never filled with
                generic text. */}
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold mb-2">Why Investors Buy {ticker}</h2>
                <p className="text-sm text-[var(--gray-700)] leading-relaxed">{whyInvestorsBuy}</p>
              </div>

              {biggestRisks && (
                <div>
                  <h2 className="text-lg font-bold mb-2">Biggest Risks</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{biggestRisks}</p>
                </div>
              )}

              {whoShouldAvoid && (
                <div>
                  <h2 className="text-lg font-bold mb-2">Who Should Avoid It</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{whoShouldAvoid}</p>
                </div>
              )}

              {historicalCharacteristics && (
                <div>
                  <h2 className="text-lg font-bold mb-2">Historical Characteristics</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{historicalCharacteristics}</p>
                </div>
              )}

              {similarEtfs.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold mb-3">Similar ETFs</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {similarEtfs.map((peer) => (
                      <EtfCard key={peer.ticker} data={comparisonPeerToCardData(peer)} compact lang="en" />
                    ))}
                  </div>
                </div>
              )}

              {comparisonPeerTicker && (
                <div>
                  <h2 className="text-lg font-bold mb-2">Frequently Compared ETFs</h2>
                  <Link
                    href={`/magazine/${articleSlug(ticker, "comparison")}`}
                    className="inline-flex px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
                  >
                    {ticker} vs {comparisonPeerTicker} — Full Comparison →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= COMMUNITY ================= */}
        <div id="etf-tab-community" className="hidden">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-5">
            <CommunityPredictionConsensus
              cradyPrediction={nextDividendHero ? { amount: nextDividendHero.amount, isOfficial: nextDividendHero.isOfficial } : null}
              lang="en"
            />
            <Suspense fallback={null}>
              <TodaysActivitySummarySection ticker={ticker} lang="en" priceHistory={history} />
            </Suspense>
          </div>

          <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-4">
            <div id="etf-activity" className="scroll-mt-24" />
            <Suspense fallback={null}>
              <ActivitySection
                ticker={ticker}
                lang="en"
                providerId={etf.provider_id}
                priceHistory={history}
                risk={risk}
                annualYieldPct={annualYieldPct}
                dividendTrendPct={trend12mo?.avgChangePct ?? null}
                latestPaidDistribution={
                  latestPaidDistribution?.amount != null
                    ? { amount: latestPaidDistribution.amount, payDate: latestPaidDistribution.pay_date }
                    : null
                }
                prediction={
                  prediction
                    ? {
                        targetPayDate: prediction.target_pay_date,
                        targetExDate: prediction.target_ex_date,
                        predictedAmount: prediction.predicted_amount,
                        confidenceScore: prediction.confidence_score,
                        predictionMethod: prediction.prediction_method,
                      }
                    : null
                }
              />
            </Suspense>
            <div id="investor-discussion" className="scroll-mt-4" />
            <Suspense fallback={null}>
              <InvestorDiscussionSection
                ticker={ticker}
                lang="en"
                annualYieldPct={annualYieldPct}
                riskLevel={risk?.risk_level ?? null}
                dividendTrendPct={trend12mo?.avgChangePct ?? null}
                payoutFrequency={etf.payout_frequency}
                nextPredictedExDate={prediction?.target_ex_date ?? null}
              />
            </Suspense>
            <Suspense fallback={null}>
              <ActivityWeeklyRecap
                ticker={ticker}
                lang="en"
                priceHistory={history}
                recentDistributions={distributions.map((d) => ({ pay_date: d.pay_date, amount: d.amount }))}
                nextPredictedExDate={prediction?.target_ex_date ?? null}
                nextPredictedPayDate={prediction?.target_pay_date ?? null}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Always visible, outside every tab — FAQ (its own JSON-LD points at
          it), deep-dive internal links, and the page footer, per Phase 3's
          SEO-safety requirement that important crawlable content never
          becomes tab-gated without reason. Same outer boundary as the
          Summary tab's content (max-w-[1400px] px-6) — this section used
          to be narrower (max-w-4xl), which made the page's left/right
          edges jump inward partway down the Summary tab. The snippet
          paragraph keeps its own readable line length via an inner
          max-width rather than narrowing the whole section. */}
      <div className="mx-auto max-w-[1400px] px-6 mt-8">
        <div className="max-w-[850px]">
          <ProfileSnippet text={profileSnippetText} />
        </div>
        <ProfileFaq items={profileFaqItems} lang="en" />

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">{ticker} Deep Dive</h2>
          <div className="flex gap-2 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2 sm:pb-0 snap-x snap-mandatory sm:snap-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {MAGAZINE_TYPES.map((type) => (
              <Link
                key={type}
                href={`/magazine/${articleSlug(ticker, type)}`}
                className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {ARTICLE_TYPE_LABEL[type]}
              </Link>
            ))}
            {comparisonPeerTicker && (
              <Link
                href={`/magazine/${articleSlug(ticker, "comparison")}`}
                className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {ticker} vs {comparisonPeerTicker}
              </Link>
            )}
            <Link
              href="/ranking"
              className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              Full ETF Ranking
            </Link>
            <Link
              href="/about#methodology"
              className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              Prediction Methodology
            </Link>
          </div>
        </div>

        <RelatedContent
          lang="en"
          articles={articleLinks}
          etfs={etfLinks}
          rankings={rankingLinks}
          guides={guideLinks}
          nextReading={{ href: `/magazine/${articleSlug(ticker, "next-dividend-prediction")}`, label: `${ticker} Next Dividend Prediction` }}
        />

        <EtfAppCta ticker={ticker} lang="en" />
        <PageTrustFooter lang="en" />
      </div>
    </div>
  );
}

/** Filters out pipeline placeholder values like the literal string "unknown". */
function isKnown(v: string | null): v is string {
  return !!v && v.trim().toLowerCase() !== "unknown";
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
