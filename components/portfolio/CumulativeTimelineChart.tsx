"use client";

import { useState } from "react";
import type { PortfolioAnalysis } from "@/lib/portfolio/analyze";

const T = {
  title: { en: "Cumulative Return Timeline", ko: "누적 수익 타임라인" },
  priceOnly: { en: "Price Only", ko: "가격만" },
  dividendsIncluded: { en: "Dividends Included", ko: "배당 포함" },
  baseline: { en: "Initial Investment", ko: "초기 투자금" },
  noData: { en: "Not enough real price history to draw a timeline yet.", ko: "타임라인을 그릴 만큼 가격 이력이 충분하지 않습니다." },
  dividendEvents: { en: (n: number) => `${n} dividend event${n === 1 ? "" : "s"} in this period`, ko: (n: number) => `이 기간 중 배당 이벤트 ${n}건` },
  textSummary: { en: "Text summary", ko: "텍스트 요약" },
} as const;

const WIDTH = 640;
const HEIGHT = 200;
const PAD = 8;

export function CumulativeTimelineChart({ timeline, lang = "en" }: { timeline: PortfolioAnalysis["timeline"]; lang?: "en" | "ko" }) {
  const [mode, setMode] = useState<"price" | "dividends">("dividends");

  if (!timeline || timeline.points.length < 2) {
    return (
      <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
        <div className="text-caption">{T.title[lang]}</div>
        <p className="mt-2 text-sm text-[var(--gray-400)]">{T.noData[lang]}</p>
      </div>
    );
  }

  const { points, events } = timeline;
  const series = points.map((p) => (mode === "price" ? p.priceOnlyValue : p.dividendsIncludedValue));
  const baselineSeries = points.map((p) => p.baseline);
  const allValues = [...series, ...baselineSeries];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const scaleX = (i: number) => PAD + (i / (points.length - 1)) * (WIDTH - PAD * 2);
  const scaleY = (v: number) => HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);

  const linePath = (values: number[]) => values.map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`).join(" ");

  const last = points[points.length - 1];
  const first = points[0];
  const summaryText =
    lang === "ko"
      ? `${first.date}부터 ${last.date}까지, ${mode === "price" ? "가격만" : "배당 포함"} 기준 평가금액은 $${series[0].toFixed(0)}에서 $${series[series.length - 1].toFixed(0)}로 변화했습니다. 초기 투자금은 $${baselineSeries[baselineSeries.length - 1].toFixed(0)}입니다.`
      : `From ${first.date} to ${last.date}, the ${mode === "price" ? "price-only" : "dividend-inclusive"} value moved from $${series[0].toFixed(0)} to $${series[series.length - 1].toFixed(0)}. Initial investment: $${baselineSeries[baselineSeries.length - 1].toFixed(0)}.`;

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-caption">{T.title[lang]}</div>
        <div className="inline-flex rounded-lg border border-[var(--gray-200)] p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("price")}
            className={`px-2.5 py-1 rounded-md transition-colors ${mode === "price" ? "bg-black text-white" : "text-[var(--gray-500)]"}`}
          >
            {T.priceOnly[lang]}
          </button>
          <button
            type="button"
            onClick={() => setMode("dividends")}
            className={`px-2.5 py-1 rounded-md transition-colors ${mode === "dividends" ? "bg-black text-white" : "text-[var(--gray-500)]"}`}
          >
            {T.dividendsIncluded[lang]}
          </button>
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-40 mt-3" preserveAspectRatio="none" role="img" aria-label={summaryText}>
        <path d={linePath(baselineSeries)} fill="none" stroke="var(--gray-300)" strokeWidth="1.5" strokeDasharray="4 3" />
        <path d={linePath(series)} fill="none" stroke={series[series.length - 1] >= series[0] ? "#0f9d58" : "#d93025"} strokeWidth="2" />
        {events.map((e, i) => {
          const idx = points.findIndex((p) => p.date === e.date);
          if (idx === -1) return null;
          return <circle key={`${e.date}-${e.ticker}-${i}`} cx={scaleX(idx)} cy={scaleY(series[idx])} r="2" fill="var(--crady-accent)" />;
        })}
      </svg>

      <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--gray-500)]">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-[var(--gray-300)] inline-block" style={{ borderTop: "1.5px dashed var(--gray-300)" }} /> {T.baseline[lang]}
        </span>
        {events.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--crady-accent)] inline-block" /> {T.dividendEvents[lang](events.length)}
          </span>
        )}
      </div>

      {/* Accessible text summary — same data as the SVG, for screen readers
          and anyone who wants the numbers without reading a chart. */}
      <p className="mt-2 text-xs text-[var(--gray-500)]">{summaryText}</p>
    </div>
  );
}
