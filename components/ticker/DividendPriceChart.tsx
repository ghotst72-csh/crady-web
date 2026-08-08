"use client";

import { useMemo, useState } from "react";
import {
  CHART_RANGES,
  filterHistoryByRange,
  filterDistributionsByRange,
  computeChartWindowMetrics,
  type ChartRangeId,
  type PriceHistoryPoint,
  type DistributionPoint,
} from "@/lib/ticker/dividendPriceChart";

/** CRADY Phase 2 — the ticker page's single major visualization (spec §4):
 * one chart, price line on top and real distribution payments as bars
 * below on a shared timeline, so "what happened to the price while these
 * dividends were paid" reads visually before any number is read. Renders
 * from data already fetched by the page (price history + distributions) —
 * no new query. */

const T = {
  title: { en: "Dividend & Price History", ko: "배당 & 가격 히스토리" },
  priceChange: { en: "Price Change", ko: "가격 변동" },
  totalDistributions: { en: "Total Distributions", ko: "총 분배금" },
  latestDistribution: { en: "Latest Distribution", ko: "최근 분배금" },
  annualYield: { en: "Annualized Yield", ko: "연환산 분배율" },
  maxDrawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
  price: { en: "Price", ko: "가격" },
  distributions: { en: "Distributions", ko: "분배금" },
  notEnoughData: { en: "Not enough price history yet for this window.", ko: "이 기간에 대한 가격 데이터가 아직 충분하지 않습니다." },
  na: "—",
} as const;

const RANGE_LABEL: Record<ChartRangeId, string> = { "1M": "1M", "3M": "3M", "6M": "6M", "1Y": "1Y", ALL: "ALL" };

function fmtPct(n: number | null): string {
  if (n == null) return T.na;
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function DividendPriceChart({
  history,
  distributions,
  latestDistribution,
  annualYieldPct,
  maxDrawdownPct,
  todayIso = new Date().toISOString().slice(0, 10),
  lang = "en",
}: {
  history: PriceHistoryPoint[];
  distributions: DistributionPoint[];
  latestDistribution: { amount: number; payDate: string } | null;
  annualYieldPct: number | null;
  maxDrawdownPct: number | null;
  todayIso?: string;
  lang?: "en" | "ko";
}) {
  const [range, setRange] = useState<ChartRangeId>("1Y");

  const windowHistory = useMemo(() => filterHistoryByRange(history, range, todayIso), [history, range, todayIso]);
  const windowDistributions = useMemo(
    () => filterDistributionsByRange(distributions, range, todayIso),
    [distributions, range, todayIso]
  );
  const metrics = useMemo(
    () => computeChartWindowMetrics(windowHistory, windowDistributions),
    [windowHistory, windowDistributions]
  );

  const closes = windowHistory.filter((h) => h.close_price != null) as { trade_date: string; close_price: number }[];
  const hasPrice = closes.length >= 2;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold">{T.title[lang]}</h2>
        <div className="inline-flex rounded-lg border border-[var(--gray-200)] p-0.5 text-xs font-semibold">
          {CHART_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                range === r ? "bg-black text-white" : "text-[var(--gray-500)] hover:text-black"
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 border border-[var(--gray-200)] rounded-xl p-4">
        {hasPrice ? (
          <ChartSvg closes={closes} distributions={windowDistributions} lang={lang} />
        ) : (
          <div className="h-[180px] flex items-center justify-center text-sm text-[var(--gray-400)]">
            {T.notEnoughData[lang]}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Metric label={`${T.priceChange[lang]} (${RANGE_LABEL[range]})`} value={fmtPct(metrics.priceChangePct)} tone={metrics.priceChangePct} />
        <Metric
          label={`${T.totalDistributions[lang]} (${RANGE_LABEL[range]})`}
          value={metrics.totalDistributions != null ? `$${metrics.totalDistributions.toFixed(4)}` : T.na}
        />
        <Metric
          label={T.latestDistribution[lang]}
          value={latestDistribution ? `$${latestDistribution.amount.toFixed(4)}` : T.na}
          sub={latestDistribution?.payDate}
        />
        <Metric label={T.annualYield[lang]} value={annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : T.na} accent />
        <Metric label={T.maxDrawdown[lang]} value={maxDrawdownPct != null ? `${maxDrawdownPct.toFixed(1)}%` : T.na} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
  accent,
}: {
  label: string;
  value: string;
  sub?: string | null;
  tone?: number | null;
  accent?: boolean;
}) {
  const toneClass =
    tone != null ? (tone >= 0 ? "text-emerald-700" : "text-red-700") : accent ? "text-[#92400e]" : "";
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3">
      <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--gray-500)] mt-0.5">{sub}</div>}
    </div>
  );
}

const W = 700;
const PRICE_H = 150;
const DIV_H = 46;
const GAP = 10;
const TOTAL_H = PRICE_H + GAP + DIV_H;

function ChartSvg({
  closes,
  distributions,
  lang,
}: {
  closes: { trade_date: string; close_price: number }[];
  distributions: DistributionPoint[];
  lang: "en" | "ko";
}) {
  const startTime = new Date(closes[0].trade_date + "T00:00:00Z").getTime();
  const endTime = new Date(closes[closes.length - 1].trade_date + "T00:00:00Z").getTime();
  const span = Math.max(endTime - startTime, 1);
  const x = (iso: string) => ((new Date(iso + "T00:00:00Z").getTime() - startTime) / span) * W;

  const prices = closes.map((c) => c.close_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceRange = max - min || 1;
  const yPrice = (p: number) => PRICE_H - ((p - min) / priceRange) * (PRICE_H - 12) - 6;

  const points = closes.map((c) => `${x(c.trade_date).toFixed(1)},${yPrice(c.close_price).toFixed(1)}`).join(" ");
  const first = prices[0];
  const last = prices[prices.length - 1];
  const up = last >= first;

  const realDistributions = distributions.filter(
    (d): d is { pay_date: string; amount: number } => d.amount != null && d.pay_date >= closes[0].trade_date
  );
  const maxAmount = realDistributions.length > 0 ? Math.max(...realDistributions.map((d) => d.amount)) : 1;
  const barW = Math.max(2, Math.min(6, W / Math.max(realDistributions.length, 1) - 2));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full h-[210px]" preserveAspectRatio="none" role="img" aria-label={T.title[lang]}>
        <g>
          <polyline fill="none" stroke={up ? "#16a34a" : "#dc2626"} strokeWidth="2" points={points} />
        </g>
        <g transform={`translate(0, ${PRICE_H + GAP})`}>
          <line x1="0" y1={DIV_H} x2={W} y2={DIV_H} stroke="var(--gray-200)" strokeWidth="1" />
          {realDistributions.map((d, i) => {
            const h = Math.max(2, (d.amount / maxAmount) * (DIV_H - 4));
            return (
              <rect
                key={`${d.pay_date}-${i}`}
                x={Math.max(0, x(d.pay_date) - barW / 2)}
                y={DIV_H - h}
                width={barW}
                height={h}
                fill="#f59e0b"
                rx="1"
              >
                <title>{`${d.pay_date}: $${d.amount.toFixed(4)}`}</title>
              </rect>
            );
          })}
        </g>
      </svg>
      <div className="flex items-center justify-between text-xs text-[var(--gray-500)] mt-1">
        <span>{closes[0].trade_date}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-0.5" style={{ background: up ? "#16a34a" : "#dc2626" }} />
            {T.price[lang]}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#f59e0b]" />
            {T.distributions[lang]}
          </span>
        </span>
        <span>{closes[closes.length - 1].trade_date}</span>
      </div>
    </div>
  );
}
