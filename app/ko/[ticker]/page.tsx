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
import { buildPriceSummary, buildDividendPriceComparison } from "@/lib/ticker/priceSummary";
import { computeYieldPercentile } from "@/lib/ticker/yieldContext";
import {
  getFullNextPrediction,
  getNextScheduleRow,
  getRecentDeclaredDistributions,
} from "@/lib/ticker/nextDividendData";
import { buildNextDividendIntelligenceData } from "@/lib/ticker/buildNextDividendIntelligenceData";
import { NextDividendIntelligence } from "@/components/ticker/NextDividendIntelligence";
import { buildNextDividendDirectAnswer, buildNextDividendFaq } from "@/lib/ticker/nextDividendNarrative";
import { RESERVED_PATHS } from "@/lib/reserved";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DividendStagePill } from "@/components/DividendLifecycle";
import { EtfAppCta } from "@/components/EtfAppCta";
import { EtfHero } from "@/components/EtfHero";
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
import { getRelevantGuidesForEtf, GUIDE_LABELS } from "@/lib/magazine/topicalLinks";
import { RelatedContent } from "@/components/RelatedContent";
import { PageTrustFooter } from "@/components/seo/PageTrustFooter";
import { Badge } from "@/components/ui/Badge";
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

export const revalidate = 3600;

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
  ]);
  const trend12mo = computeDividendTrend(yearOfDistributions).find((w) => w.days === 365) ?? null;

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
  const changeFromLastPct =
    latestPaidDistribution?.amount != null &&
    latestPaidDistribution.amount > 0 &&
    prediction?.predicted_amount != null
      ? ((prediction.predicted_amount - latestPaidDistribution.amount) /
          latestPaidDistribution.amount) *
        100
      : null;

  // ETF Detail Page v3 — Investor Dashboard Redesign. See the English
  // ticker page for the full rationale; mirrored 1:1 with lang="ko".
  const priceSummary = buildPriceSummary(history);
  const dividendPriceComparison = buildDividendPriceComparison(history, recentDistributions);
  const yieldContext = computeYieldPercentile(
    annualYieldPct,
    homeSnapshot.map((s) => s.annualYieldPct),
    "ko"
  );

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

  // ETF Detail Page v3 — Hero Quick Links (requirement #10). See the
  // English ticker page for the full rationale; mirrored 1:1.
  const heroQuickLinks = [
    { href: "#next-dividend-intelligence", label: "다음 배당 인텔리전스" },
    { href: "#price-chart", label: "가격 이력" },
    { href: "#dividend-history", label: "배당 이력" },
    similarEtfs.length > 0 ? { href: "#similar-etfs", label: "유사 ETF 비교" } : null,
    { href: "#ai-outlook", label: "AI 전망" },
    { href: "#etf-activity", label: "활동" },
    { href: `/ko/portfolio?ticker=${ticker}`, label: "내 보유 ETF 분석하기" },
  ].filter((l): l is { href: string; label: string } => l != null);

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
  const nextDividendFaq = buildNextDividendFaq(
    {
      ticker,
      exDate: nextDividendIntelligenceData.schedule.exDividend.date,
      payDate: nextDividendIntelligenceData.schedule.payment.date,
      declarationDate: nextDividendIntelligenceData.schedule.declaration.date,
      pointEstimate: nextDividendIntelligenceData.pointEstimate,
      isOfficial: nextDividendIntelligenceData.isOfficial,
      officialAmount: nextDividendIntelligenceData.officialAmount,
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
  const lifecycleStage = computeLifecycleStage({
    cycleDeclarationDate: nextDividendIntelligenceData.schedule.declaration.date,
    cycleExDate: nextDividendIntelligenceData.schedule.exDividend.date,
    cyclePayDate: nextDividendIntelligenceData.schedule.payment.date,
    hasNextCyclePrediction: nextDividendIntelligenceData.pointEstimate != null,
    lastCycleEvaluated: predictionVsOfficial != null,
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
  const profileFaqItems = [...buildProfileFaqItems(profileSeoInput, "ko"), ...nextDividendFaq];
  const faqJsonLd = buildFaqJsonLd(profileFaqItems);
  const webPageJsonLd = buildWebPageJsonLd({
    name: `${ticker} — ${etf.name ?? ticker}`,
    description: profileSnippetText,
    url: `https://crady.net/ko/${ticker.toLowerCase()}`,
    speakableSelectors: ["#profile-snippet"],
    inLanguage: "ko",
  });

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

      <EtfHero
        ticker={ticker}
        name={etf.name}
        providerId={etf.provider_id}
        category={isKnown(etf.category) ? etf.category : null}
        riskLevel={risk?.risk_level ?? null}
        updatedAt={risk?.calculated_at ?? null}
        yieldPct={annualYieldPct}
        cradyScore={risk?.crady_score ?? null}
        dividendStabilityScore={risk?.dividend_stability_score ?? null}
        payoutFrequency={etf.payout_frequency}
        latestDividend={
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
              }
            : null
        }
        changeFromLastPct={changeFromLastPct}
        recentPayments={distributions.slice(0, 3).map((d) => ({ amount: d.amount, payDate: d.pay_date }))}
        trend12mo={trend12mo}
        directAnswer={directAnswer}
        priceSummary={priceSummary}
        dividendPriceComparison={dividendPriceComparison}
        yieldContext={yieldContext}
        quickLinks={heroQuickLinks}
        lang="ko"
      />

      {/* CRADY Engagement & Intelligence Phase 2, Part A — see the English
          ticker page for the full rationale on placement. */}
      <NextDividendIntelligence data={nextDividendIntelligenceData} directAnswer={nextDividendDirectAnswer} lang="ko" />

      {/* CRADY Intelligence 4.0 — see the English ticker page for the full
          rationale; mirrored 1:1 here. */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 mt-6 space-y-4">
        <AiDailySummary sentences={aiSummarySentences} lang="ko" />
        <div className="grid sm:grid-cols-2 gap-4">
          <YieldExplainer explanation={yieldExplanation} lang="ko" />
          <RiskExplainer context={riskContext} lang="ko" />
        </div>
        <ScoreBreakdown breakdown={scoreBreakdown} lang="ko" />
        <div className="grid sm:grid-cols-2 gap-4">
          <EtfDnaCard traits={dnaTraits} lang="ko" />
          <ScenarioCards scenarios={scenarios} lang="ko" />
        </div>
        <EtfLifecycleTimeline stage={lifecycleStage} lang="ko" />
        <ForecastHistoryTimeline rows={evaluatedPredictionHistory} lang="ko" />
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <TodaysActivitySummarySection ticker={ticker} lang="ko" priceHistory={history} />
        </Suspense>
        <ProfileSnippet text={profileSnippetText} />
      </div>

      {/* ETF Activity — see app/(en)/[ticker]/page.tsx for the full
          rationale on why this sits here instead of at the bottom, and for
          why the two static anchor divs live in this synchronous shell
          rather than on the streamed sections themselves. */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div id="etf-activity" className="scroll-mt-4" />
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
        <div id="investor-discussion" className="scroll-mt-4" />
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

      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8">
        <OfficialDistributionBlock
          official={officialDistribution}
          predictionComparison={predictionVsOfficial}
          lang="ko"
        />

        <div id="price-chart" className="mt-8 scroll-mt-4">
          <h2 className="text-lg font-bold mb-3">가격 이력</h2>
          <div className="grid sm:grid-cols-[auto_1fr] gap-3">
            <Stat
              label="종가"
              value={price?.close_price != null ? `$${price.close_price.toFixed(2)}` : "—"}
              sub={price?.trade_date}
            />
            <div>
              {history.length > 0 ? (
                <PriceSparkline history={history} />
              ) : (
                <div className="border border-[var(--gray-200)] rounded-xl p-4 text-sm text-[var(--gray-400)] h-full flex items-center">
                  가격 이력 없음
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="dividend-history" className="mt-8 scroll-mt-4">
          <h2 className="text-lg font-bold mb-3">최근 배당 이력</h2>
          <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
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
                  {distributions.map((d, i) => {
                    const prior = distributions[i + 1]?.amount ?? null;
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
                  {distributions.length === 0 && (
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

        <div className="mt-8">
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

        <div className="mt-8">
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
              <p className="text-[var(--gray-700)] text-sm leading-relaxed whitespace-pre-line">
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
              <p className="text-sm text-[var(--gray-700)]">{regime.description}</p>
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

        <div className="mt-8 space-y-6">
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

          {similarEtfs.length > 0 && (
            <div id="similar-etfs" className="scroll-mt-4">
              <h2 className="text-lg font-bold mb-3">유사 ETF</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {similarEtfs.map((peer) => (
                  <Link
                    key={peer.ticker}
                    href={`/ko/${peer.ticker.toLowerCase()}`}
                    className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{peer.ticker}</span>
                      {peer.riskLevel && <Badge variant="neutral">{peer.riskLevel}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-[var(--gray-500)]">{providerLabel(peer.provider_id)}</div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>
                        <span className="text-[var(--gray-500)]">분배율 </span>
                        <span className="font-semibold text-[#92400e]">
                          {peer.annualYieldPct != null ? `${peer.annualYieldPct.toFixed(1)}%` : "—"}
                        </span>
                      </span>
                      <span>
                        <span className="text-[var(--gray-500)]">CRADY </span>
                        <span className="font-semibold">{peer.cradyScore != null ? peer.cradyScore.toFixed(1) : "—"}</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {comparisonPeerTicker && (
            <div>
              <h2 className="text-lg font-bold mb-2">자주 비교되는 ETF</h2>
              <Link
                href={`/magazine/${articleSlug(ticker, "comparison")}`}
                className="inline-flex px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {ticker} vs {comparisonPeerTicker} — 전체 비교 보기 →
              </Link>
            </div>
          )}
        </div>

        <ProfileFaq items={profileFaqItems} lang="ko" />

        {/* Deep-dive links into the Magazine system — Magazine is
            English-only (no /ko mirror, see the International SEO report),
            so these intentionally point to the English Magazine URLs even
            from the Korean ticker page rather than being omitted. */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">{ticker} 상세 분석</h2>
          {/* Horizontally scrollable chip row on mobile (too many chips to
              wrap cleanly in a narrow viewport without breaking the header
              rhythm) — reverts to the original wrapping row at sm+. */}
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
      {/* gray-600, not gray-400 — gray-400 fails WCAG contrast at this size. */}
      {sub && <div className="text-xs text-[var(--gray-600)] mt-0.5">{sub}</div>}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function PriceSparkline({
  history,
}: {
  history: { trade_date: string; close_price: number | null }[];
}) {
  const prices = history
    .map((h) => h.close_price)
    .filter((p): p is number => p != null);
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 600;
  const h = 120;
  const step = w / (prices.length - 1);
  const points = prices
    .map((p, i) => `${i * step},${h - ((p - min) / range) * (h - 10) - 5}`)
    .join(" ");

  const first = prices[0];
  const last = prices[prices.length - 1];
  const up = last >= first;

  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={up ? "#22c55e" : "#ef4444"}
          strokeWidth="2"
          points={points}
        />
      </svg>
      <div className="flex justify-between text-xs text-[var(--gray-500)] mt-2">
        <span>${min.toFixed(2)}</span>
        <span>${max.toFixed(2)}</span>
      </div>
    </div>
  );
}
