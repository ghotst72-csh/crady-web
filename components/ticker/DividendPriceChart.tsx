"use client";

import { useId, useMemo, useState } from "react";
import {
  CHART_RANGES,
  filterHistoryByRange,
  filterDistributionsByRange,
  computeChartWindowMetrics,
  computeEvenTicks,
  type ChartRangeId,
  type PriceHistoryPoint,
  type DistributionPoint,
} from "@/lib/ticker/dividendPriceChart";

/** CRADY ETF Detail UI (reference-locked) — the single combined price +
 * distribution visualization, one plot area with dual y-axes (price on
 * the left, distribution on the right) sharing one timeline, rather than
 * two stacked panes. Real data only: price history + distributions
 * already fetched by the page — no new query. */

const T = {
  title: { en: "Dividend & Price History", ko: "배당 & 가격 히스토리" },
  priceChange: { en: "Price Change", ko: "가격 변동" },
  totalDistributions: { en: "Total Distributions", ko: "총 분배금" },
  latestDistribution: { en: "Latest Distribution", ko: "최근 분배금" },
  annualYield: { en: "Annualized Yield", ko: "연환산 분배율" },
  maxDrawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
  price: { en: "Price (USD)", ko: "가격 (USD)" },
  distribution: { en: "Distribution (USD)", ko: "분배금 (USD)" },
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
  showMetrics = true,
}: {
  history: PriceHistoryPoint[];
  distributions: DistributionPoint[];
  latestDistribution: { amount: number; payDate: string } | null;
  annualYieldPct: number | null;
  maxDrawdownPct: number | null;
  todayIso?: string;
  lang?: "en" | "ko";
  /** History tab keeps the metrics row (Phase 3); the reference-locked
   * Summary panel deliberately omits it — those numbers already live in
   * the separate Summary metrics row below, so showing them twice would
   * be the "중복된 정보" the spec explicitly rules out. */
  showMetrics?: boolean;
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
                range === r ? "bg-indigo-50 text-indigo-700" : "text-[var(--gray-500)] hover:text-black"
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
          <div className="h-[280px] flex items-center justify-center text-sm text-[var(--gray-400)]">
            {T.notEnoughData[lang]}
          </div>
        )}
      </div>

      {showMetrics && (
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
      )}
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

const PLOT_W = 800;
const PLOT_H = 260;
const LEFT_AXIS_W = 46;
const RIGHT_AXIS_W = 54;
const TOP_PAD = 14;
const BOTTOM_AXIS_H = 26;
const TOTAL_W = LEFT_AXIS_W + PLOT_W + RIGHT_AXIS_W;
const TOTAL_H = TOP_PAD + PLOT_H + BOTTOM_AXIS_H;
const Y_TICKS = 5;
const X_TICKS = 7;
const LINE_COLOR = "#4f46e5";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ChartSvg({
  closes,
  distributions,
  lang,
}: {
  closes: { trade_date: string; close_price: number }[];
  distributions: DistributionPoint[];
  lang: "en" | "ko";
}) {
  const gradientId = useId();
  const startTime = new Date(closes[0].trade_date + "T00:00:00Z").getTime();
  const endTime = new Date(closes[closes.length - 1].trade_date + "T00:00:00Z").getTime();
  const span = Math.max(endTime - startTime, 1);
  const x = (iso: string) => LEFT_AXIS_W + ((new Date(iso + "T00:00:00Z").getTime() - startTime) / span) * PLOT_W;

  const prices = closes.map((c) => c.close_price);
  const priceMinRaw = Math.min(...prices);
  const priceMaxRaw = Math.max(...prices);
  const pricePad = (priceMaxRaw - priceMinRaw) * 0.08 || priceMaxRaw * 0.05 || 1;
  const priceMin = Math.max(0, priceMinRaw - pricePad);
  const priceMax = priceMaxRaw + pricePad;
  const priceRange = priceMax - priceMin || 1;
  const yPrice = (p: number) => PLOT_H - ((p - priceMin) / priceRange) * PLOT_H;

  const realDistributions = distributions.filter(
    (d): d is { pay_date: string; amount: number } => d.amount != null && d.pay_date >= closes[0].trade_date
  );
  const distMaxRaw = realDistributions.length > 0 ? Math.max(...realDistributions.map((d) => d.amount)) : 1;
  const distMax = distMaxRaw * 1.15 || 1;
  const yDist = (amt: number) => PLOT_H - (amt / distMax) * PLOT_H;

  const linePoints = closes.map((c) => `${x(c.trade_date).toFixed(1)},${yPrice(c.close_price).toFixed(1)}`).join(" ");
  const areaPoints = `${LEFT_AXIS_W},${PLOT_H} ${linePoints} ${LEFT_AXIS_W + PLOT_W},${PLOT_H}`;

  const priceTicks = computeEvenTicks(priceMin, priceMax, Y_TICKS);
  const distTicks = computeEvenTicks(0, distMax, Y_TICKS);

  const xTickTimes = computeEvenTicks(startTime, endTime, X_TICKS);
  const barW = Math.max(2, Math.min(6, PLOT_W / Math.max(realDistributions.length, 1) - 2));

  return (
    <div>
      <svg viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`} className="w-full h-[300px]" role="img" aria-label={T.title[lang]}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.14" />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(0, ${TOP_PAD})`}>
          {/* Gridlines + left (price) axis labels */}
          {priceTicks.map((t, i) => (
            <g key={`pt-${i}`}>
              <line x1={LEFT_AXIS_W} y1={yPrice(t)} x2={LEFT_AXIS_W + PLOT_W} y2={yPrice(t)} stroke="var(--gray-100)" strokeWidth="1" />
              <text x={LEFT_AXIS_W - 8} y={yPrice(t) + 4} textAnchor="end" fontSize="11" fill="var(--gray-500)">
                ${t < 10 ? t.toFixed(2) : t.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Right (distribution) axis labels */}
          {distTicks.map((t, i) => (
            <text key={`dt-${i}`} x={LEFT_AXIS_W + PLOT_W + 8} y={yDist(t) + 4} textAnchor="start" fontSize="11" fill="var(--gray-500)">
              ${t.toFixed(2)}
            </text>
          ))}

          {/* Distribution bars (right axis) */}
          {realDistributions.map((d, i) => (
            <rect
              key={`${d.pay_date}-${i}`}
              x={Math.max(LEFT_AXIS_W, x(d.pay_date) - barW / 2)}
              y={yDist(d.amount)}
              width={barW}
              height={Math.max(2, PLOT_H - yDist(d.amount))}
              fill="#16a34a"
              rx="1"
            >
              <title>{`${d.pay_date}: $${d.amount.toFixed(4)}`}</title>
            </rect>
          ))}

          {/* Price area fill + line (left axis) */}
          <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
          <polyline fill="none" stroke={LINE_COLOR} strokeWidth="2" points={linePoints} />

          {/* X-axis labels */}
          {xTickTimes.map((t, i) => {
            const d = new Date(t);
            return (
              <text
                key={`xt-${i}`}
                x={LEFT_AXIS_W + ((t - startTime) / span) * PLOT_W}
                y={PLOT_H + 18}
                textAnchor={i === 0 ? "start" : i === xTickTimes.length - 1 ? "end" : "middle"}
                fontSize="11"
                fill="var(--gray-500)"
              >
                {MONTH_SHORT[d.getUTCMonth()]} &apos;{String(d.getUTCFullYear()).slice(2)}
              </text>
            );
          })}
        </g>
      </svg>

      <div className="flex items-center justify-center gap-5 text-xs text-[var(--gray-500)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5" style={{ background: LINE_COLOR }} />
          {T.price[lang]}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-[#16a34a]" />
          {T.distribution[lang]}
        </span>
      </div>
    </div>
  );
}
