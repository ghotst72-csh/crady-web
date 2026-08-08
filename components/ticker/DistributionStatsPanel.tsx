"use client";

import { useState } from "react";
import type { TrendWindow } from "@/lib/magazine/trend";
import type { AllTimeDistributionStats } from "@/lib/ticker/distributionStats";

/** CRADY Phase 3 — History tab's aggregate stats (spec §5): "3M / 6M / 12M
 * / ALL — Average / Highest / Lowest / Total / Trend," reusing the
 * existing computeDividendTrend windows (already computed elsewhere on
 * the page, no new query) plus one all-time rollup. Pure presentation —
 * every number is real, already-fetched data. */

type RangeId = "3M" | "6M" | "12M" | "ALL";
const RANGES: RangeId[] = ["3M", "6M", "12M", "ALL"];

const T = {
  average: { en: "Average Distribution", ko: "평균 분배금" },
  highest: { en: "Highest", ko: "최고" },
  lowest: { en: "Lowest", ko: "최저" },
  total: { en: "Total Distributions", ko: "총 분배금" },
  trend: { en: "Trend", ko: "추세" },
  payments: { en: "payments", ko: "회 지급" },
  na: "—",
} as const;

export function DistributionStatsPanel({
  window3m,
  window6m,
  window12m,
  allTime,
  lang = "en",
}: {
  window3m: TrendWindow;
  window6m: TrendWindow;
  window12m: TrendWindow;
  allTime: import("@/lib/ticker/distributionStats").AllTimeDistributionStats;
  lang?: "en" | "ko";
}) {
  const [range, setRange] = useState<RangeId>("12M");

  const stat =
    range === "3M"
      ? { count: window3m.count, total: window3m.avg != null ? window3m.avg * window3m.count : null, average: window3m.avg, highest: window3m.max, lowest: window3m.min, increases: window3m.increases, decreases: window3m.decreases }
      : range === "6M"
        ? { count: window6m.count, total: window6m.avg != null ? window6m.avg * window6m.count : null, average: window6m.avg, highest: window6m.max, lowest: window6m.min, increases: window6m.increases, decreases: window6m.decreases }
        : range === "12M"
          ? { count: window12m.count, total: window12m.avg != null ? window12m.avg * window12m.count : null, average: window12m.avg, highest: window12m.max, lowest: window12m.min, increases: window12m.increases, decreases: window12m.decreases }
          : { count: allTime.count, total: allTime.total, average: allTime.average, highest: allTime.highest, lowest: allTime.lowest, increases: null, decreases: null };

  function fmt(n: number | null): string {
    return n != null ? `$${n.toFixed(4)}` : T.na;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-[var(--gray-600)]">{lang === "ko" ? "분배금 통계" : "Distribution Statistics"}</h3>
        <div className="inline-flex rounded-lg border border-[var(--gray-200)] p-0.5 text-xs font-semibold">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                range === r ? "bg-black text-white" : "text-[var(--gray-500)] hover:text-black"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label={T.average[lang]} value={fmt(stat.average)} />
        <Stat label={T.highest[lang]} value={fmt(stat.highest)} tone="up" />
        <Stat label={T.lowest[lang]} value={fmt(stat.lowest)} tone="down" />
        <Stat label={T.total[lang]} value={fmt(stat.total)} sub={stat.count > 0 ? `${stat.count} ${T.payments[lang]}` : undefined} accent />
      </div>

      {(stat.increases != null || stat.decreases != null) && (
        <div className="mt-2 text-xs text-[var(--gray-500)]">
          {T.trend[lang]}: <span className="text-emerald-700 font-semibold">{stat.increases ?? 0}↑</span>{" "}
          <span className="text-red-700 font-semibold">{stat.decreases ?? 0}↓</span>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone, accent }: { label: string; value: string; sub?: string; tone?: "up" | "down"; accent?: boolean }) {
  const toneClass = tone === "up" ? "text-emerald-700" : tone === "down" ? "text-red-700" : accent ? "text-[#92400e]" : "";
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3">
      <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className={`mt-1 text-base font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--gray-500)] mt-0.5">{sub}</div>}
    </div>
  );
}
