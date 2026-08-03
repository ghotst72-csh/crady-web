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
  computeRunRateAnnualYieldPct,
  providerLabel,
} from "@/lib/data";
import { RESERVED_PATHS } from "@/lib/reserved";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DividendStagePill } from "@/components/DividendLifecycle";
import { EtfAppCta } from "@/components/EtfAppCta";
import { EtfHero } from "@/components/EtfHero";
import { articleSlug } from "@/lib/magazine/recipes";
import { pickComparisonPeerTicker, pickComparisonPeerTickers } from "@/lib/magazine/comparison";
import { getComparisonPeersData } from "@/lib/magazine/data";
import { ARTICLE_TYPE_LABEL, type ArticleTypeId } from "@/lib/magazine/types";
import { getLatestOfficialDistributionForTicker, getPredictionVsOfficial } from "@/lib/distributions/data";
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
    rawPrediction,
    siblings,
    allTickers,
    officialDistribution,
    predictionVsOfficial,
  ] = await Promise.all([
    getRiskMetrics(ticker),
    getRegimeProfile(ticker),
    getLatestPrice(ticker),
    getPriceHistory(ticker, 30),
    getDistributions(ticker, 12),
    getDistributionsSince(ticker, 90),
    getDistributionsSince(ticker, 395),
    getNextPrediction(ticker),
    getSameProviderEtfs(etf.provider_id, ticker),
    getAllTickers(),
    getLatestOfficialDistributionForTicker(ticker),
    getPredictionVsOfficial(ticker),
  ]);
  const trend12mo = computeDividendTrend(yearOfDistributions).find((w) => w.days === 365) ?? null;

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
        lang="en"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Suspense fallback={null}>
          <TodaysActivitySummarySection ticker={ticker} lang="en" priceHistory={history} />
        </Suspense>
        <ProfileSnippet text={profileSnippetText} />
      </div>

      {/* ETF Activity — inserted here (right after the Hero/snippet, well
          before the rest of the page's existing financial content) rather
          than appended at the bottom, per the product direction: investors
          should notice this ETF has activity immediately, not after
          scrolling through the whole page. Own Suspense boundary + own
          Promise.all, fully separate from the fetch above — never blocks
          Hero/Prediction from rendering first.

          The two static anchor divs (id + scroll-mt-4) live in this
          synchronous shell rather than on the streamed sections themselves
          — see the doc comment on ActivitySection in ActivitySection.tsx
          for why: it's what keeps each anchor id unique in the DOM even
          during Next.js's brief out-of-order-streaming swap window. */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div id="etf-activity" className="scroll-mt-4" />
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
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8">
        <OfficialDistributionBlock
          official={officialDistribution}
          predictionComparison={predictionVsOfficial}
          lang="en"
        />

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">Current Price</h2>
          <div className="grid sm:grid-cols-[auto_1fr] gap-3">
            <Stat
              label="Close Price"
              value={price?.close_price != null ? `$${price.close_price.toFixed(2)}` : "—"}
              sub={price?.trade_date}
            />
            <div>
              {history.length > 0 ? (
                <PriceSparkline history={history} />
              ) : (
                <div className="border border-[var(--gray-200)] rounded-xl p-4 text-sm text-[var(--gray-400)] h-full flex items-center">
                  No price history
                </div>
              )}
            </div>
          </div>
        </div>

        <div id="dividend-history" className="mt-8 scroll-mt-4">
          <h2 className="text-lg font-bold mb-3">Recent Dividend History</h2>
          <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
            <div className="max-h-[420px] overflow-y-auto overflow-x-auto">
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
                  {distributions.length === 0 && (
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

        <div className="mt-8">
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
                  <Link
                    key={peer.ticker}
                    href={`/${peer.ticker.toLowerCase()}`}
                    className="border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{peer.ticker}</span>
                      {peer.riskLevel && <Badge variant="neutral">{peer.riskLevel}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-[var(--gray-500)]">{providerLabel(peer.provider_id)}</div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span>
                        <span className="text-[var(--gray-500)]">Yield </span>
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

        <ProfileFaq items={profileFaqItems} lang="en" />

        {/* Deep-dive links into the Magazine system — every ticker page
            fans out to its full Magazine coverage plus the site-wide
            ranking, so no page on the site is a dead end. */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">{ticker} Deep Dive</h2>
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

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
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
