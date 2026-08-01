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
import { pickComparisonPeerTicker } from "@/lib/magazine/comparison";
import { ARTICLE_TYPE_LABEL, type ArticleTypeId } from "@/lib/magazine/types";
import { getLatestOfficialDistributionForTicker, getPredictionVsOfficial } from "@/lib/distributions/data";
import { OfficialDistributionBlock } from "@/components/distributions/OfficialDistributionBlock";
import { computeDividendTrend } from "@/lib/magazine/trend";
import { buildProfileSnippet, buildProfileFaqItems } from "@/lib/ticker/profileSeo";
import { ProfileSnippet, ProfileFaq } from "@/components/ticker/ProfileSeoBlock";
import { buildFaqJsonLd, buildWebPageJsonLd } from "@/lib/magazine/jsonld";

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
        lang="ko"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <ProfileSnippet text={profileSnippetText} />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8">
        <OfficialDistributionBlock
          official={officialDistribution}
          predictionComparison={predictionVsOfficial}
          lang="ko"
        />

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">현재 가격</h2>
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

        <EtfAppCta ticker={ticker} lang="ko" />
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
