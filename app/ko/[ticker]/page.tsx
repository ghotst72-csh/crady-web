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
import { buildDailySummary } from "@/lib/ticker/aiSummary";
import { YieldExplainer } from "@/components/ticker/YieldExplainer";
import { RiskExplainer } from "@/components/ticker/RiskExplainer";
import { ScoreBreakdown } from "@/components/ticker/ScoreBreakdown";
import { ScenarioCards } from "@/components/ticker/ScenarioCards";
import { EtfDnaCard } from "@/components/ticker/EtfDnaCard";
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

  const title = `${ticker} — ${etf.name ?? ticker} 배당 정보`;
  const description = [
    `${ticker}(${providerLabel(etf.provider_id)}) 고배당 ETF.`,
    yieldPct != null ? `연환산 분배율 ${yieldPct.toFixed(1)}%.` : null,
    risk?.crady_score != null ? `CRADY 점수 ${risk.crady_score.toFixed(1)}.` : null,
    "배당 일정, 예상 배당금, 위험도를 확인하세요.",
  ]
    .filter(Boolean)
    .join(" ");

  const url = `https://crady.net/ko/${ticker.toLowerCase()}`;
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: `https://crady.net/${ticker.toLowerCase()}`,
        ko: url,
        "x-default": `https://crady.net/${ticker.toLowerCase()}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "ko_KR",
      alternateLocale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function KoreanTickerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { ticker: rawTicker } = await params;

  if (rawTicker !== rawTicker.toLowerCase()) {
    permanentRedirect(`/ko/${rawTicker.toLowerCase()}`);
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
    // CRADY Phase 3 — see the English ticker page for the full rationale;
    // mirrored 1:1 with lang="ko".
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
    // CRADY ETF Detail UI — see the English ticker page for the full
    // rationale; mirrored 1:1 with lang="ko".
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
  // this ETF actually tracks one (risk.underlying_ticker).
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

  // ETF Detail Page v3 — Investor Dashboard Redesign. See the English
  // ticker page for the full rationale; mirrored 1:1 with lang="ko".
  const priceSummary = buildPriceSummary(history);

  const comparisonPeerTicker = pickComparisonPeerTicker(ticker, etf.provider_id, allTickers);
  const MAGAZINE_TYPES: ArticleTypeId[] = [
    "next-dividend-prediction",
    "dividend-guide",
    "dividend-calendar",
    "dividend-history",
    "risk-analysis",
  ];

  // SEO Authority Phase 2 — see the English ticker page for the full
  // rationale on every addition below; mirrored 1:1 with lang="ko".
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
  const whyInvestorsBuy = buildWhyInvestorsBuy(enrichmentInput, "ko");
  const biggestRisks = buildBiggestRisks(enrichmentInput, isKnown(etf.risk_summary) ? etf.risk_summary : null, "ko");
  const whoShouldAvoid = buildWhoShouldAvoid(enrichmentInput, "ko");
  const historicalCharacteristics = buildHistoricalCharacteristics(enrichmentInput, "ko");

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
    "ko"
  );

  // CRADY Engagement & Intelligence Phase 2, Part A — see the English
  // ticker page for the full rationale; mirrored 1:1 with lang="ko".
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
    lang: "ko",
    underlyingVolatility30d: underlyingMomentum?.volatility_30d ?? null,
  });
  // Phase 2/3 — see the English ticker page for the full rationale;
  // mirrored 1:1 with lang="ko".
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
  const nextDividendExpectedRange = nextDividendIntelligenceData.expectedRange;

  const nextDividendDirectAnswer = buildNextDividendDirectAnswer(
    {
      ticker,
      exDate: nextDividendIntelligenceData.schedule.exDividend.date,
      pointEstimate: nextDividendIntelligenceData.pointEstimate,
      isOfficial: nextDividendIntelligenceData.isOfficial,
      officialAmount: nextDividendIntelligenceData.officialAmount,
      payDate: nextDividendIntelligenceData.schedule.payment.date,
    },
    "ko"
  );

  // CRADY Intelligence 4.0 — rule-based "why" explanations (see the
  // English ticker page for the full rationale — mirrored 1:1 here).
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
    "ko"
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
  const aiSummarySentences = buildDailySummary(
    { ticker, directAnswer, notes: risk?.notes ?? null, yieldExplanation, scoreBreakdown, riskContext },
    "ko"
  );

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
  const etfLinks = similarEtfs.map((peer) => ({ href: `/ko/${peer.ticker.toLowerCase()}`, label: `${peer.ticker}와 비교` }));
  const rankingLinks = [
    { href: "/ko/ranking", label: "전체 ETF 랭킹" },
    { href: "/ko/calendar", label: "배당 캘린더" },
    { href: "/ko/distributions", label: "공식 배당 발표 센터" },
  ];

  const financialProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: etf.name ?? ticker,
    inLanguage: "ko",
    tickerSymbol: ticker,
    provider: { "@type": "Organization", name: providerLabel(etf.provider_id) },
    category: isKnown(etf.category) ? etf.category : undefined,
    url: `https://crady.net/ko/${ticker.toLowerCase()}`,
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

  // AI Overview Optimization Phase 1 — see the English ticker page for the
  // full rationale; built from data already fetched above, no new query.
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
  const profileSnippetText = buildProfileSnippet(profileSeoInput, "ko");
  const profileFaqItems = buildProfileFaqItems(profileSeoInput, "ko");
  const faqJsonLd = buildFaqJsonLd(profileFaqItems);
  const webPageJsonLd = buildWebPageJsonLd({
    name: `${ticker} — ${etf.name ?? ticker}`,
    description: profileSnippetText,
    url: `https://crady.net/ko/${ticker.toLowerCase()}`,
    speakableSelectors: ["#profile-snippet"],
    inLanguage: "ko",
  });

  const distributions12mTotal = window12m.avg != null ? window12m.avg * window12m.count : null;

  return (
    <div className="pb-10">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://crady.net/ko" },
          { name: ticker, url: `https://crady.net/ko/${ticker.toLowerCase()}` },
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

      {/* CRADY ETF Detail UI (reference-locked) — see the English ticker
          page for the full rationale; mirrored 1:1 with lang="ko". */}
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
        lang="ko"
      />

      <div id="etf-workspace" className="mt-2 scroll-mt-14">
        <EtfWorkspaceTabs lang="ko" communityCount={communityCount} />

        {/* ================= 서머리 (기본 탭) ================= */}
        <div id="etf-tab-summary">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
            <NextDividendPanel data={nextDividendHero ?? EMPTY_NEXT_DIVIDEND} lang="ko" />

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
                lang="ko"
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
                lang="ko"
              />
            </div>
          </div>
        </div>

        {/* ================= 다음 배당 ================= */}
        <div id="etf-tab-next-dividend" className="hidden">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
            {/* Same hero component Summary uses — see the English ticker
                page for the full rationale; mirrored 1:1 with lang="ko". */}
            <NextDividendPanel data={nextDividendHero ?? EMPTY_NEXT_DIVIDEND} expectedRange={nextDividendExpectedRange} lang="ko" />

            {nextDividendDirectAnswer && (
              <p className="mt-3 text-sm text-[var(--gray-600)] max-w-[850px]">{nextDividendDirectAnswer}</p>
            )}

            <p className="mt-2 text-sm">
              <Link href={`/ko/${ticker.toLowerCase()}/next-dividend`} className="font-medium text-[#92400e] hover:underline">
                다음 배당 전체 분석 보기 →
              </Link>
            </p>

            <div className="mt-6">
              <NextDividendIntelligence data={nextDividendIntelligenceData} lang="ko" />
            </div>

            <div className="mt-6">
              <PredictionTrackRecord
                trackRecord={nextDividendIntelligenceData.trackRecord}
                rows={evaluatedPredictionHistory}
                lang="ko"
                basePath="/ko"
              />
            </div>

            <div className="mt-6">
              <ScenarioCards scenarios={scenarios} lang="ko" />
            </div>

            <div className="mt-6">
              <OfficialDistributionBlock official={officialDistribution} predictionComparison={null} lang="ko" />
            </div>
          </div>
        </div>

        {/* ================= 히스토리 ================= */}
        <div id="etf-tab-history" className="hidden">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
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
              lang="ko"
            />

            <div className="mt-6">
              <DistributionStatsPanel window3m={window3m} window6m={window6m} window12m={window12m} allTime={allTimeStats} lang="ko" />
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-bold mb-3">전체 배당 이력</h2>
              <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
                <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[var(--gray-50)] text-[var(--gray-500)]">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">기준일</th>
                        <th className="text-left px-4 py-2.5 font-medium">지급일</th>
                        <th className="text-right px-4 py-2.5 font-medium">배당금</th>
                        <th className="text-right px-4 py-2.5 font-medium">상태</th>
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
                                {d.amount != null ? `$${d.amount.toFixed(4)}` : "예정"}
                                {delta != null && delta !== 0 && (
                                  <span className="ml-1 text-xs">{delta > 0 ? "▲" : "▼"}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} lang="ko" />
                            </td>
                          </tr>
                        );
                      })}
                      {allDistributions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-[var(--gray-400)]">
                            배당 내역 없음
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

        {/* ================= 분석 도구 ================= */}
        <div id="etf-tab-analysis" className="hidden">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
            {/* 1. CRADY 점수 + 구성 요소 — AI 서술이 아닌 분석 핵심이 먼저 온다 (spec §4). */}
            <ScoreBreakdown breakdown={scoreBreakdown} lang="ko" />

            {/* 2/3. 리스크·하락폭, 배당/수익률 흐름 — 다른 곳과 동일한 카드 언어의 2단 배치. */}
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <RiskExplainer context={riskContext} lang="ko" />
              <YieldExplainer explanation={yieldExplanation} lang="ko" />
            </div>

            <div className="mt-6">
              <EtfDnaCard traits={dnaTraits} lang="ko" />
            </div>

            {/* 4. 펀드 정보. */}
            <div className="mt-6">
              <h2 className="text-lg font-bold mb-3">운용사</h2>
              <div className="border border-[var(--gray-200)] rounded-xl p-4">
                <div className="font-semibold">{providerLabel(etf.provider_id)}</div>
                {siblings.length > 0 && (
                  <>
                    <div className="text-xs text-[var(--gray-500)] mt-3 mb-2">
                      {providerLabel(etf.provider_id)}의 다른 ETF
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {siblings.map((s) => (
                        <Link
                          key={s.ticker}
                          href={`/ko/${s.ticker.toLowerCase()}`}
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

            <div className="mt-6">
              <h2 className="text-lg font-bold mb-3">기본 정보</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <DetailField
                  label="배당 주기"
                  value={isKnown(etf.payout_frequency) ? etf.payout_frequency! : "—"}
                />
                <DetailField label="카테고리" value={isKnown(etf.category) ? etf.category! : "—"} />
                <DetailField
                  label="운용 보수"
                  value={isKnown(etf.expense_ratio) ? etf.expense_ratio! : "—"}
                />
                <DetailField label="AUM" value={isKnown(etf.aum) ? etf.aum! : "—"} />
                {isKnown(etf.inception_date) && <DetailField label="상장일" value={etf.inception_date!} />}
                {etf.holdings_count != null && <DetailField label="보유 종목 수" value={String(etf.holdings_count)} />}
              </div>

              {(etf.investment_strategy || etf.long_description || etf.short_description) && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">운용 전략</div>
                  <p className="text-[var(--gray-700)] text-sm leading-relaxed whitespace-pre-line max-w-[850px]">
                    {etf.investment_strategy || etf.long_description || etf.short_description}
                  </p>
                  {etf.benchmark && (
                    <p className="text-sm text-[var(--gray-500)] mt-2">
                      기초자산 / 벤치마크: {etf.benchmark}
                    </p>
                  )}
                </div>
              )}

              {regime?.description && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">
                    시장 상태 분석
                  </div>
                  <p className="text-sm text-[var(--gray-700)] max-w-[850px]">{regime.description}</p>
                </div>
              )}

              {isKnown(etf.source_url) && (
                <div className="mt-4 border border-[var(--gray-200)] rounded-xl p-4">
                  <div className="text-xs font-semibold text-[var(--gray-500)] mb-1">공식 운용사 자료</div>
                  <a
                    href={etf.source_url!}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-sm text-[#92400e] underline hover:text-black"
                  >
                    {ticker} 공식 펀드 페이지 →
                  </a>
                </div>
              )}
            </div>

            {/* SEO Authority Phase 2 — 실제 데이터 기반의 정형화된(비-LLM) 콘텐츠.
                검색 가치를 위해 유지하되(spec §10), 전체 워크스페이스 폭이 아닌
                읽기 좋은 내부 폭으로 제한하고 분석 핵심보다 아래에 배치한다. */}
            <div className="mt-6 space-y-6 max-w-[850px]">
              <div>
                <h2 className="text-lg font-bold mb-2">{ticker}에 투자하는 이유</h2>
                <p className="text-sm text-[var(--gray-700)] leading-relaxed">{whyInvestorsBuy}</p>
              </div>

              {biggestRisks && (
                <div>
                  <h2 className="text-lg font-bold mb-2">주요 리스크</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{biggestRisks}</p>
                </div>
              )}

              {whoShouldAvoid && (
                <div>
                  <h2 className="text-lg font-bold mb-2">이런 투자자에게는 적합하지 않을 수 있습니다</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{whoShouldAvoid}</p>
                </div>
              )}

              {historicalCharacteristics && (
                <div>
                  <h2 className="text-lg font-bold mb-2">과거 배당 특성</h2>
                  <p className="text-sm text-[var(--gray-700)] leading-relaxed">{historicalCharacteristics}</p>
                </div>
              )}
            </div>

            {similarEtfs.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-bold mb-3">유사 ETF</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {similarEtfs.map((peer) => (
                    <EtfCard key={peer.ticker} data={comparisonPeerToCardData(peer)} compact lang="ko" />
                  ))}
                </div>
              </div>
            )}

            {comparisonPeerTicker && (
              <div className="mt-6">
                <h2 className="text-lg font-bold mb-2">자주 비교되는 ETF</h2>
                <Link
                  href={`/magazine/${articleSlug(ticker, "comparison")}`}
                  className="inline-flex px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
                >
                  {ticker} vs {comparisonPeerTicker} — 전체 비교 보기 →
                </Link>
              </div>
            )}

            {/* 5. AI 생성 콘텐츠 — 하나의 간결한 섹션으로 맨 아래에만 배치하며,
                이 탭의 시각적 핵심이 되지 않도록 한다 (spec §4). */}
            <div className="mt-6">
              <AiDailySummary sentences={aiSummarySentences} lang="ko" />
            </div>
          </div>
        </div>

        {/* ================= 커뮤니티 ================= */}
        <div id="etf-tab-community" className="hidden">
          <div className="mx-auto max-w-[1400px] px-6 pt-6">
            <h2 className="text-lg font-bold">{ticker} 커뮤니티</h2>

            {/* 실제 투자자 심리/배당 기대치가 먼저 — 데이터가 부족하면
                조작된 내용 없이 정직한 빈 상태를 보여준다. */}
            <div className="mt-4">
              <CommunityPredictionConsensus
                cradyPrediction={nextDividendHero ? { amount: nextDividendHero.amount, isOfficial: nextDividendHero.isOfficial } : null}
                lang="ko"
              />
            </div>

            {/* 실제 토론 공간 — 토론 시작하기, 최신 토론, 댓글/답글이
                자동화된 활동 콘텐츠보다 먼저 온다 (spec §5). */}
            <div id="investor-discussion" className="mt-6 scroll-mt-4">
              <Suspense fallback={null}>
                <InvestorDiscussionSection
                  ticker={ticker}
                  lang="ko"
                  annualYieldPct={annualYieldPct}
                  riskLevel={risk?.risk_level ?? null}
                  dividendTrendPct={trend12mo?.avgChangePct ?? null}
                  payoutFrequency={etf.payout_frequency}
                  nextPredictedExDate={prediction?.target_ex_date ?? null}
                />
              </Suspense>
            </div>

            {/* 공식 CRADY 자동 생성 이벤트 — 실제 데이터이지만 페이지를
                지배하지 않도록 실제 토론 콘텐츠 아래로 배치한다 (spec §5). */}
            <div id="etf-activity" className="mt-6 scroll-mt-24">
              <Suspense fallback={null}>
                <TodaysActivitySummarySection ticker={ticker} lang="ko" priceHistory={history} />
              </Suspense>
              <Suspense fallback={null}>
                <ActivitySection
                  ticker={ticker}
                  lang="ko"
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
              <Suspense fallback={null}>
                <ActivityWeeklyRecap
                  ticker={ticker}
                  lang="ko"
                  priceHistory={history}
                  recentDistributions={distributions.map((d) => ({ pay_date: d.pay_date, amount: d.amount }))}
                  nextPredictedExDate={prediction?.target_ex_date ?? null}
                  nextPredictedPayDate={prediction?.target_pay_date ?? null}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Always visible, outside every tab — see the English ticker page
          for the full rationale (width bug fix: same boundary as the
          Summary tab's content). */}
      <div className="mx-auto max-w-[1400px] px-6 mt-8">
        <div className="max-w-[850px]">
          <ProfileSnippet text={profileSnippetText} />
        </div>
        <ProfileFaq items={profileFaqItems} lang="ko" />

        {/* Deep-dive links into the Magazine system — Magazine is
            English-only (no /ko mirror, see the International SEO report),
            so these intentionally point to the English Magazine URLs even
            from the Korean ticker page rather than being omitted. */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">{ticker} 상세 분석</h2>
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
              href="/ko/ranking"
              className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              전체 ETF 랭킹
            </Link>
            <Link
              href="/ko/about#methodology"
              className="shrink-0 whitespace-nowrap snap-start px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              예측 방법론
            </Link>
          </div>
        </div>

        <RelatedContent
          lang="ko"
          articles={articleLinks}
          etfs={etfLinks}
          rankings={rankingLinks}
          guides={guideLinks}
          nextReading={{ href: `/magazine/${articleSlug(ticker, "next-dividend-prediction")}`, label: `${ticker} Next Dividend Prediction` }}
        />

        <EtfAppCta ticker={ticker} lang="ko" />
        <PageTrustFooter lang="ko" />
      </div>
    </div>
  );
}

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
