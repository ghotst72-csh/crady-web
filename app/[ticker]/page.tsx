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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
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
            위험도 {risk.risk_level}
          </span>
        )}
      </div>

      {/* Key stats */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="현재 가격"
          value={price?.close_price != null ? `$${price.close_price.toFixed(2)}` : "—"}
          sub={price?.trade_date}
        />
        <Stat
          label="연환산 분배율"
          value={annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : "—"}
        />
        <Stat
          label="CRADY 점수"
          value={risk?.crady_score != null ? risk.crady_score.toFixed(1) : "—"}
          accent
        />
        <Stat
          label="배당 주기"
          value={isKnown(etf.payout_frequency) ? etf.payout_frequency! : "—"}
        />
      </div>

      {/* Next / latest dividend */}
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-sm font-semibold text-[var(--gray-500)]">
            최근 배당금
          </div>
          {latestPaidDistribution ? (
            <>
              <div className="text-2xl font-bold mt-1">
                ${latestPaidDistribution.amount?.toFixed(4)}
              </div>
              <div className="text-sm text-[var(--gray-500)]">
                지급일 {latestPaidDistribution.pay_date}
              </div>
            </>
          ) : (
            <div className="text-[var(--gray-400)] mt-1">데이터 없음</div>
          )}
        </div>
        <div className="border border-[var(--gray-200)] rounded-xl p-4">
          <div className="text-sm font-semibold text-[var(--gray-500)]">
            다음 예상 배당
          </div>
          {prediction ? (
            <>
              <div className="text-2xl font-bold mt-1">
                {prediction.predicted_amount != null
                  ? `$${prediction.predicted_amount.toFixed(4)}`
                  : "—"}
              </div>
              <div className="text-sm text-[var(--gray-500)]">
                예상 지급일 {prediction.target_pay_date ?? "미정"}
                {prediction.confidence_score != null &&
                  ` · 신뢰도 ${prediction.confidence_score.toFixed(0)}%`}
              </div>
            </>
          ) : (
            <div className="text-[var(--gray-400)] mt-1">예측 데이터 없음</div>
          )}
        </div>
      </div>

      {/* Strategy / description */}
      {(etf.investment_strategy || etf.long_description || etf.short_description) && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">운용 전략</h2>
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

      {/* Regime */}
      {regime?.description && (
        <div className="mt-8 border border-[var(--gray-200)] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[var(--gray-500)] mb-1">
            시장 상태 분석
          </h2>
          <p className="text-sm text-[var(--gray-700)]">{regime.description}</p>
        </div>
      )}

      {/* Price history */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">최근 가격 추이 (30거래일)</h2>
        {history.length > 0 ? (
          <PriceSparkline history={history} />
        ) : (
          <div className="text-sm text-[var(--gray-400)]">가격 이력 없음</div>
        )}
      </div>

      {/* Distribution history */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-3">배당 내역</h2>
        <div className="border border-[var(--gray-200)] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--gray-50)] text-[var(--gray-500)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">기준일</th>
                <th className="text-left px-4 py-2 font-medium">지급일</th>
                <th className="text-right px-4 py-2 font-medium">배당금</th>
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
                </tr>
              ))}
              {distributions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-[var(--gray-400)]">
                    배당 내역 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Related ETFs — same provider */}
      {siblings.length > 0 && (
        <div className="mt-10 border-t border-[var(--gray-200)] pt-8">
          <h2 className="text-lg font-bold mb-3">
            {providerLabel(etf.provider_id)}의 다른 ETF
          </h2>
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
        </div>
      )}
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
