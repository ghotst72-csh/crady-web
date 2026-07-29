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
  getNextPrediction,
  getSameProviderEtfs,
  computeAnnualYieldPct,
  providerLabel,
} from "@/lib/data";
import { RESERVED_PATHS } from "@/lib/reserved";
import { BreadcrumbJsonLd } from "@/components/BreadcrumbJsonLd";
import { DividendLifecycleStepper, DividendStagePill } from "@/components/DividendLifecycle";
import { EtfAppCta } from "@/components/EtfAppCta";

export const revalidate = 3600;

const RISK_LABEL: Record<string, string> = {
  SAFE: "안정",
  NORMAL: "보통",
  RISKY: "위험",
  EXTREME: "고위험",
};

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
  const title = `${ticker} — ${etf.name ?? ticker} 배당 정보`;
  const description = `${ticker}(${providerLabel(
    etf.provider_id
  )}) 배당 ETF의 현재 가격, 배당 내역, 다음 예상 배당, CRADY 점수를 확인하세요.`;

  return {
    title,
    description,
    alternates: { canonical: `https://crady.net/${ticker.toLowerCase()}` },
    openGraph: {
      title,
      description,
      url: `https://crady.net/${ticker.toLowerCase()}`,
      type: "website",
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

  const [risk, regime, price, history, distributions, prediction, siblings] =
    await Promise.all([
      getRiskMetrics(ticker),
      getRegimeProfile(ticker),
      getLatestPrice(ticker),
      getPriceHistory(ticker, 30),
      getDistributions(ticker, 12),
      getNextPrediction(ticker),
      getSameProviderEtfs(etf.provider_id, ticker),
    ]);

  const annualYieldPct = computeAnnualYieldPct(distributions, price?.close_price ?? null);
  const latestPaidDistribution = distributions.find((d) => d.amount != null);
  const changeFromLastPct =
    latestPaidDistribution?.amount != null &&
    latestPaidDistribution.amount > 0 &&
    prediction?.predicted_amount != null
      ? ((prediction.predicted_amount - latestPaidDistribution.amount) /
          latestPaidDistribution.amount) *
        100
      : null;

  const financialProductJsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: etf.name ?? ticker,
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
    ...(annualYieldPct != null
      ? { interestRate: `${annualYieldPct.toFixed(2)}%` }
      : {}),
  };

  return (
    <div className="mx-auto max-w-4xl xl:max-w-5xl px-4 sm:px-6 py-10">
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

      {/* Header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-bold">{ticker}</h1>
        <span className="text-[var(--gray-500)]">{etf.name}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
          {providerLabel(etf.provider_id)}
        </span>
        {isKnown(etf.category) && (
          <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
            {etf.category}
          </span>
        )}
        {risk?.risk_level && (
          <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
            위험도 {RISK_LABEL[risk.risk_level] ?? risk.risk_level}
          </span>
        )}
      </div>

      {/* Adaptive desktop layout: from xl up, quick-glance stats (price/
          score/provider/app CTA) sit in a right column instead of just
          widening the mobile column. DOM order stays ①②③④⑤⑥+CTA — the
          exact mobile reading order — and xl:col-start places sections into
          column 1 (main, long-form) or column 2 (rail, at-a-glance) without
          reordering the markup, so mobile is unaffected. */}
      <div className="xl:grid xl:grid-cols-[1fr_320px] xl:gap-x-8 xl:items-start">

      {/* ① Next estimated dividend — the single question investors land here
          to answer, so it leads the page instead of being buried under a
          generic stat grid. */}
      <div className="mt-8 xl:col-start-1 border border-[var(--gray-200)] rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-amber-50/40 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--gray-500)]">
            다음 예상 배당
          </h2>
          {prediction?.target_ex_date && prediction?.target_pay_date && (
            <DividendStagePill
              exDate={prediction.target_ex_date}
              payDate={prediction.target_pay_date}
            />
          )}
        </div>

        {prediction ? (
          <>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-4xl sm:text-5xl font-black tabular-nums">
                {prediction.predicted_amount != null
                  ? `$${prediction.predicted_amount.toFixed(4)}`
                  : "—"}
              </span>
              {changeFromLastPct != null && (
                <span
                  className={`text-sm font-semibold ${
                    changeFromLastPct > 0
                      ? "text-green-600"
                      : changeFromLastPct < 0
                        ? "text-red-500"
                        : "text-[var(--gray-500)]"
                  }`}
                >
                  지난 지급 대비 {changeFromLastPct > 0 ? "+" : ""}
                  {changeFromLastPct.toFixed(1)}%
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <DetailField label="다음 지급일" value={prediction.target_pay_date ?? "미정"} />
              <DetailField label="Ex-Date" value={prediction.target_ex_date ?? "미정"} />
              <DetailField
                label="예상 연환산 수익률"
                value={annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : "—"}
              />
              <DetailField
                label="신뢰도"
                value={
                  prediction.confidence_score != null
                    ? `${prediction.confidence_score.toFixed(0)}%`
                    : "—"
                }
              />
            </div>

            {prediction.target_ex_date && prediction.target_pay_date && (
              <div className="mt-6">
                <DividendLifecycleStepper
                  exDate={prediction.target_ex_date}
                  payDate={prediction.target_pay_date}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 text-[var(--gray-400)] text-sm">
            아직 예측 데이터가 없습니다. 최근 배당 이력을 참고하세요.
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--gray-400)]">
          예상 배당금과 지급일은 과거 지급 패턴 기반 추정치이며 실제와 다를 수 있습니다.
        </p>
      </div>

      {/* ② Recent dividend history */}
      <div className="mt-8 xl:col-start-1">
        <h2 className="text-lg font-bold mb-3">최근 배당 이력</h2>
        <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">기준일</th>
                <th className="text-left px-4 py-2 font-medium">지급일</th>
                <th className="text-right px-4 py-2 font-medium">배당금</th>
                <th className="text-right px-4 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-100)]">
              {distributions.map((d, i) => (
                <tr key={`${d.ex_date}-${i}`}>
                  <td className="px-4 py-2">{d.ex_date}</td>
                  <td className="px-4 py-2">{d.pay_date}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    {d.amount != null ? `$${d.amount.toFixed(4)}` : "예정"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <DividendStagePill exDate={d.ex_date} payDate={d.pay_date} />
                  </td>
                </tr>
              ))}
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

      {/* ③ Current price — pinned to row 1 so the rail starts level with
          the "다음 예상 배당" hero block instead of trailing behind it
          (grid auto-placement would otherwise queue it behind row 1's
          content in column 1). */}
      <div className="mt-8 xl:col-start-2 xl:row-start-1">
        <h2 className="text-lg font-bold mb-3">현재 가격</h2>
        <div className="grid sm:grid-cols-[auto_1fr] xl:grid-cols-1 gap-3">
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

      {/* ④ CRADY score */}
      <div className="mt-8 xl:col-start-2">
        <h2 className="text-lg font-bold mb-3">CRADY 점수</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
          <Stat
            label="CRADY 점수"
            value={risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"}
            accent
          />
          <Stat
            label="위험도"
            value={risk?.risk_level ? RISK_LABEL[risk.risk_level] ?? risk.risk_level : "—"}
          />
          <Stat
            label="배당 안정성"
            value={
              risk?.dividend_stability_score != null
                ? risk.dividend_stability_score.toFixed(1)
                : "—"
            }
          />
          <Stat
            label="30일 변동성"
            value={risk?.volatility_30d != null ? `${risk.volatility_30d.toFixed(1)}%` : "—"}
          />
        </div>
      </div>

      {/* ⑤ Provider / related ETFs */}
      <div className="mt-8 xl:col-start-2">
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

      {/* ⑥ Basic info — strategy, regime, and reference fields; kept in the
          main column since it's long-form reading, not a quick-glance stat */}
      <div className="mt-8 xl:col-start-1">
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

      <div className="xl:col-start-2">
        <EtfAppCta ticker={ticker} />
      </div>
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
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-4">
      <div className="text-xs text-[var(--gray-500)]">{label}</div>
      <div
        className={`text-xl font-bold mt-1 ${accent ? "text-[var(--crady-accent)]" : ""}`}
      >
        {value}
      </div>
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
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
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
