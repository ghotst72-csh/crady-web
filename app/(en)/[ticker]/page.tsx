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

  const [risk, regime, price, history, distributions, recentDistributions, rawPrediction, siblings, allTickers] =
    await Promise.all([
      getRiskMetrics(ticker),
      getRegimeProfile(ticker),
      getLatestPrice(ticker),
      getPriceHistory(ticker, 30),
      getDistributions(ticker, 12),
      getDistributionsSince(ticker, 90),
      getNextPrediction(ticker),
      getSameProviderEtfs(etf.provider_id, ticker),
      getAllTickers(),
    ]);

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
        lang="en"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 mt-8">
        <div>
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
            <table className="w-full text-sm">
              <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Ex-Date</th>
                  <th className="text-left px-4 py-2 font-medium">Pay Date</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gray-100)]">
                {distributions.map((d, i) => (
                  <tr key={`${d.ex_date}-${i}`}>
                    <td className="px-4 py-2">{d.ex_date}</td>
                    <td className="px-4 py-2">{d.pay_date}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {d.amount != null ? `$${d.amount.toFixed(4)}` : "TBD"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} lang="en" />
                    </td>
                  </tr>
                ))}
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
        </div>

        {/* Deep-dive links into the Magazine system — every ticker page
            fans out to its full Magazine coverage plus the site-wide
            ranking, so no page on the site is a dead end. */}
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-3">{ticker} Deep Dive</h2>
          <div className="flex flex-wrap gap-2">
            {MAGAZINE_TYPES.map((type) => (
              <Link
                key={type}
                href={`/magazine/${articleSlug(ticker, type)}`}
                className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {ARTICLE_TYPE_LABEL[type]}
              </Link>
            ))}
            {comparisonPeerTicker && (
              <Link
                href={`/magazine/${articleSlug(ticker, "comparison")}`}
                className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
              >
                {ticker} vs {comparisonPeerTicker}
              </Link>
            )}
            <Link
              href="/ranking"
              className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              Full ETF Ranking
            </Link>
            <Link
              href="/about#methodology"
              className="px-3 py-1.5 border border-[var(--gray-200)] rounded-full text-sm hover:border-black transition-colors"
            >
              Prediction Methodology
            </Link>
          </div>
        </div>

        <EtfAppCta ticker={ticker} lang="en" />
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
      {sub && <div className="text-xs text-[var(--gray-400)] mt-0.5">{sub}</div>}
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
