"use client";

import { useState } from "react";
import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { DataStatusBadge } from "@/components/portfolio/DataStatusBadge";
import { useWatchlist } from "@/lib/watchlist/useWatchlist";
import type { PriceDataStatus } from "@/lib/portfolio/types";

/** CRADY Design System 2.0 — the CRADY ETF Premium Card. One shared
 * component and one data model, used everywhere an ETF appears as a
 * visual unit: Home, Ranking, Portfolio, Compare, ETF Detail, Related
 * ETFs, Watchlist. Purely a presentation-layer component — every field it
 * renders is real data computed elsewhere (Portfolio's analyze.ts,
 * getHomeSnapshot, etc.); this file adds no new calculation, prediction,
 * or scoring logic of its own. Not a literal Hearthstone frame/asset
 * clone — CRADY's own minimal black/gray/amber system, restrained
 * animation only (hover lift, soft glow, smooth expand — no fire, no
 * fantasy, no heavy 3D). */

const T = {
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  income: { en: "Income", ko: "인컴" },
  stability: { en: "Stability", ko: "안정성" },
  riskDefense: { en: "Risk Defense", ko: "위험 방어력" },
  growth: { en: "Growth", ko: "성장성" },
  asOf: { en: "As of", ko: "" },
  asOfSuffix: { en: "", ko: " 기준" },
  today: { en: "Today", ko: "오늘" },
  nextExDate: { en: "Next Ex-Date", ko: "다음 배당락일" },
  expectedDist: { en: "Expected Distribution", ko: "예상 분배금" },
  annualYield: { en: "Annual Yield", ko: "연환산 분배율" },
  weeklyIncome: { en: "Weekly Income", ko: "주간 인컴" },
  monthlyIncome: { en: "Monthly Income", ko: "월간 인컴" },
  coveredCall: { en: "Covered Call", ko: "커버드콜" },
  indexCoveredCall: { en: "Index Covered Call", ko: "인덱스 커버드콜" },
  exposure: { en: (t: string) => `${t} Exposure`, ko: (t: string) => `${t} 익스포저` },
  yourPosition: { en: "My Position", ko: "보유 정보" },
  shares: { en: "Shares", ko: "보유 수량" },
  purchase: { en: "Purchase", ko: "매수가" },
  current: { en: "Current", ko: "현재가" },
  return: { en: "Return", ko: "수익률" },
  received: { en: "Received", ko: "수령액" },
  estimated: { en: "estimated", ko: "추정" },
  more: { en: "More details", ko: "상세 정보" },
  less: { en: "Show less", ko: "간략히" },
} as const;

export type EtfCardData = {
  ticker: string;
  name: string | null;
  providerId: string | null;
  etfType: string | null;
  underlyingTicker?: string | null;
  currentPrice: number | null;
  todayChangePct: number | null;
  annualYieldPct: number | null;
  cradyScore: number | null;
  incomeScore?: number | null;
  stabilityScore?: number | null;
  riskDefenseScore?: number | null;
  growthScore?: number | null;
  payoutFrequency: string | null;
  riskLevel: string | null;
  asOfDate: string | null;
  /** Portfolio-only trust badge (a holding's price/data staleness) — not
   * meaningful for a generic sitewide snapshot, so optional; omitted from
   * the card when not supplied (Home/Ranking/Compare usage). */
  priceStatus?: PriceDataStatus | null;
  priceStaleDays?: number | null;
  /** Real next-cycle forecast, when available — from the same
   * next_predictions data Next Dividend Intelligence uses; a plain "not
   * available" render when null, never fabricated. */
  nextExDate?: string | null;
  expectedDistribution?: number | null;
};

export type EtfCardPosition = {
  shares: number;
  purchaseDate: string;
  avgPrice: number;
  isEstimatedPrice: boolean;
  investmentAmount: number;
  currentValue: number | null;
  dividendsReceived: number;
  priceReturnPct: number | null;
  totalReturnPct: number | null;
};

type StrategyTag = { icon: string; label: string };

function buildStrategyTags(data: EtfCardData, lang: "en" | "ko"): StrategyTag[] {
  const tags: StrategyTag[] = [];
  const freq = data.payoutFrequency?.toLowerCase() ?? null;
  if (freq === "weekly") tags.push({ icon: "📅", label: T.weeklyIncome[lang] });
  else if (freq === "monthly") tags.push({ icon: "📅", label: T.monthlyIncome[lang] });
  if (data.etfType === "single-stock-covered-call") tags.push({ icon: "🎯", label: T.coveredCall[lang] });
  else if (data.etfType === "index-covered-call") tags.push({ icon: "🎯", label: T.indexCoveredCall[lang] });
  if (data.underlyingTicker) tags.push({ icon: "🔗", label: T.exposure[lang](data.underlyingTicker) });
  return tags.slice(0, 4);
}

/** Deterministic, real-derived accent per ticker (not random) so the same
 * ETF always gets the same logo-placeholder tint — no real logo assets
 * exist in this pipeline, so this is an honest typographic placeholder
 * (first 1-2 letters), the same pattern used by most fintech apps when a
 * brand mark isn't available, not a fabricated brand asset. */
function logoTint(ticker: string): string {
  const hues = ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#ef4444", "#06b6d4"];
  let sum = 0;
  for (let i = 0; i < ticker.length; i++) sum += ticker.charCodeAt(i);
  return hues[sum % hues.length];
}

function SubScore({ label, value }: { label: string; value?: number | null }) {
  return (
    <div>
      <div className="text-[10px] text-[var(--gray-500)]">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value != null ? value.toFixed(0) : "—"}</div>
    </div>
  );
}

export function EtfCard({
  data,
  position,
  compact = false,
  showWatchlistStar = true,
  lang = "en",
}: {
  data: EtfCardData;
  position?: EtfCardPosition | null;
  /** Smaller footprint for carousels/grids (Home, Ranking, Compare) — same
   * component, same data model, just less vertical space. */
  compact?: boolean;
  /** §6 — the single star toggle. On by default; off where it would be
   * redundant with a page-level action (e.g. Compare's picker). */
  showWatchlistStar?: boolean;
  lang?: "en" | "ko";
}) {
  const [expanded, setExpanded] = useState(false);
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(data.ticker);
  const up = (data.todayChangePct ?? 0) >= 0;
  const tags = buildStrategyTags(data, lang);
  const hasSubScores = data.incomeScore != null || data.stabilityScore != null || data.riskDefenseScore != null || data.growthScore != null;
  const showExpandToggle = !compact && (hasSubScores || tags.length > 0);

  return (
    <div className="card-glow relative rounded-2xl border border-[var(--gray-200)] bg-white overflow-hidden">
      {showWatchlistStar && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle(data.ticker);
          }}
          aria-pressed={watched}
          aria-label={watched ? (lang === "ko" ? "관심종목에서 제거" : "Remove from watchlist") : lang === "ko" ? "관심종목에 추가" : "Add to watchlist"}
          className={`absolute top-3 right-3 z-10 h-7 w-7 rounded-full flex items-center justify-center text-sm transition-colors ${
            watched ? "bg-[var(--crady-accent)] text-white" : "bg-white/90 text-[var(--gray-400)] border border-[var(--gray-200)] hover:text-[var(--crady-accent)]"
          }`}
        >
          {watched ? "★" : "☆"}
        </button>
      )}
      <div className={compact ? "p-3.5" : "p-4 sm:p-5"}>
        {/* Top — logo, ticker, provider */}
        <div className="flex items-start gap-2.5 pr-8">
          <div
            aria-hidden
            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-black"
            style={{ background: logoTint(data.ticker) }}
          >
            {data.ticker.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/${data.ticker.toLowerCase()}`} className="text-lg font-black tracking-tight hover:underline">
              {data.ticker}
            </Link>
            {!compact && data.name && <div className="text-xs text-[var(--gray-500)] truncate">{data.name}</div>}
            {data.providerId && <div className="text-[11px] text-[var(--gray-500)]">{providerLabel(data.providerId)}</div>}
          </div>
        </div>

        {/* Middle — price, today's change (the biggest numbers on the card) */}
        <div className="mt-3">
          <div className={`font-black tabular-nums leading-none ${compact ? "text-2xl" : "text-3xl"}`}>
            {data.currentPrice != null ? `$${data.currentPrice.toFixed(2)}` : "—"}
          </div>
          {data.todayChangePct != null && (
            <div className={`mt-1 inline-flex items-center gap-1 text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-md ${up ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
              {up ? "▲" : "▼"} {Math.abs(data.todayChangePct).toFixed(2)}% {T.today[lang]}
            </div>
          )}
        </div>

        {/* Bottom — next ex-date, expected distribution, yield, CRADY Score */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div>
            <div className="text-[10px] text-[var(--gray-500)]">{T.nextExDate[lang]}</div>
            <div className="text-xs font-bold tabular-nums">{data.nextExDate ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--gray-500)]">{T.expectedDist[lang]}</div>
            <div className="text-xs font-bold tabular-nums">
              {data.expectedDistribution != null ? `$${data.expectedDistribution.toFixed(4)}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--gray-500)]">{T.annualYield[lang]}</div>
            <div className="text-sm font-extrabold tabular-nums text-[#92400e]">
              {data.annualYieldPct != null ? `${data.annualYieldPct.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--gray-500)]">{T.cradyScore[lang]}</div>
            <div className="text-sm font-extrabold tabular-nums text-[var(--crady-accent)]">
              {data.cradyScore != null ? data.cradyScore.toFixed(1) : "—"}
            </div>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] text-[10px] font-medium">
                <span aria-hidden>{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {!compact && (data.priceStatus || data.asOfDate) && (
          <div className="mt-2.5 flex items-center gap-2">
            {data.priceStatus && <DataStatusBadge status={data.priceStatus} lang={lang} staleDays={data.priceStaleDays} />}
            {data.asOfDate && (
              <span className="text-[11px] text-[var(--gray-400)]">
                {lang === "ko" ? `${data.asOfDate}${T.asOfSuffix.ko}` : `${T.asOf.en} ${data.asOfDate}`}
              </span>
            )}
          </div>
        )}

        {showExpandToggle && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 w-full text-center text-[11px] font-semibold text-[#92400e] hover:underline"
          >
            {expanded ? T.less[lang] : T.more[lang]}
          </button>
        )}
      </div>

      {/* Smooth expand — sub-scores, only when real data exists for at
          least one of them. */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {hasSubScores && (
            <div className="border-t border-[var(--gray-200)] px-4 sm:px-5 py-3 grid grid-cols-4 gap-2 bg-[var(--gray-50)]/60">
              <SubScore label={T.income[lang]} value={data.incomeScore} />
              <SubScore label={T.stability[lang]} value={data.stabilityScore} />
              <SubScore label={T.riskDefense[lang]} value={data.riskDefenseScore} />
              <SubScore label={T.growth[lang]} value={data.growthScore} />
            </div>
          )}
        </div>
      </div>

      {position && (
        <div className="border-t border-[var(--gray-200)] bg-[var(--gray-50)] p-4 sm:p-5">
          <div className="text-caption mb-2">{T.yourPosition[lang]}</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] text-[var(--gray-500)]">{T.shares[lang]}</div>
              <div className="text-sm font-bold tabular-nums">{position.shares.toFixed(4).replace(/\.?0+$/, "")}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--gray-500)]">{T.purchase[lang]}</div>
              <div className="text-sm font-bold tabular-nums">${position.avgPrice.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--gray-500)]">{T.current[lang]}</div>
              <div className="text-sm font-bold tabular-nums">
                {position.currentValue != null && position.shares > 0 ? `$${(position.currentValue / position.shares).toFixed(2)}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--gray-500)]">{T.return[lang]}</div>
              <div className={`text-sm font-bold tabular-nums ${(position.totalReturnPct ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {position.totalReturnPct != null ? `${position.totalReturnPct >= 0 ? "+" : ""}${position.totalReturnPct.toFixed(1)}%` : "—"}
              </div>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-[var(--gray-500)]">
            {T.received[lang]} <span className="font-bold text-[#92400e] tabular-nums">${position.dividendsReceived.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
            {position.isEstimatedPrice && <span className="ml-1 text-[var(--gray-400)]">({T.estimated[lang]} {T.purchase[lang].toLowerCase()})</span>}
          </div>
        </div>
      )}
    </div>
  );
}
