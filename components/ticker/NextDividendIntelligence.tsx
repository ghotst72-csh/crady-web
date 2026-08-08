"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { EstimateDriver, SchedulePattern } from "@/lib/ticker/nextDividendIntelligence";
import type { EstimateFactors } from "@/lib/ticker/nextDividendNarrative";

/** CRADY ETF Workspace subpage unification — this used to render the
 * whole Next Dividend hero (header, forecast-vs-official, 4-date
 * timeline, point-estimate grid). All of that is gone: the hero is now
 * NextDividendPanel, the exact same component Summary uses, rendered
 * directly by the page above this section. What remains here is just
 * "Why This Estimate?" — the always-visible short bulleted evidence list,
 * with deeper technical detail (drivers, recent pattern, schedule
 * pattern) behind "Show detailed basis". The Prediction Track Record
 * that used to live inside that accordion is gone too — it's now its own
 * prominent, non-hidden section (PredictionTrackRecord) further down the
 * tab, so showing a second copy here would just be duplication. */

const T = {
  driversTitle: { en: "Estimate Drivers", ko: "예측 근거 요소" },
  driverLabels: {
    recentDistributionHistory: { en: "Recent distribution history", ko: "최근 분배 이력" },
    underlyingVolatility: { en: "Underlying volatility", ko: "기초자산 변동성" },
    navOrPriceContext: { en: "NAV or price context", ko: "NAV 또는 가격 맥락" },
    priceDirection: { en: "Price direction", ko: "가격 방향성" },
    officialDeclaration: { en: "Official declaration", ko: "공식 발표" },
  },
  influenceLabel: {
    high: { en: "High influence", ko: "높은 영향" },
    medium: { en: "Medium influence", ko: "중간 영향" },
    low: { en: "Low influence", ko: "낮은 영향" },
    unavailable: { en: "Not available", ko: "정보 없음" },
  },
  recentPattern: { en: "Recent Distribution Pattern", ko: "최근 분배 패턴" },
  recent3: { en: "Last 3", ko: "최근 3회" },
  avg4: { en: "4-Payment Average", ko: "최근 4회 평균" },
  avg12: { en: "12-Payment Average", ko: "최근 12회 평균" },
  navContext: { en: "NAV and Price Context", ko: "NAV 및 가격 맥락" },
  noNav: {
    en: "CRADY does not currently have NAV data for this fund — the current market price is shown instead and is not labeled as NAV.",
    ko: "CRADY는 현재 이 펀드의 NAV 데이터를 보유하고 있지 않습니다 — 현재 시장가를 대신 표시하며, 이를 NAV로 표기하지 않습니다.",
  },
  declaration: { en: "Declaration", ko: "선언" },
  exDividend: { en: "Ex-Dividend", ko: "배당락" },
  payment: { en: "Payment", ko: "지급" },
  schedulePattern: { en: "Recent Schedule Pattern", ko: "최근 일정 패턴" },
  scheduleVaries: { en: "This cycle's schedule pattern varies from recent history.", ko: "이번 일정은 최근 패턴과 다릅니다." },
  whyEstimate: { en: "Why This Estimate?", ko: "왜 이렇게 예상하나요?" },
  showDetail: { en: "Show detailed basis", ko: "상세 근거 보기" },
  hideDetail: { en: "Hide detailed basis", ko: "상세 근거 숨기기" },
  whatWouldChange: { en: "What would change this estimate?", ko: "무엇이 이 예상치를 바꿀 수 있나요?" },
} as const;

export type NextDividendWhyData = {
  ticker: string;
  isOfficial: boolean;
  whyThisEstimate: string;
  drivers: EstimateDriver[];
  recentAmounts: number[]; // most recent first
  avg4: number | null;
  avg12: number | null;
  schedulePattern: SchedulePattern | null;
  estimateFactors?: EstimateFactors;
  whatWouldChangeThis?: string[];
};

export function NextDividendIntelligence({ data, lang = "en" }: { data: NextDividendWhyData; lang?: "en" | "ko" }) {
  const [expanded, setExpanded] = useState(false);
  const { ticker, isOfficial, whyThisEstimate, drivers, recentAmounts, avg4, avg12, schedulePattern, estimateFactors, whatWouldChangeThis } = data;

  if (isOfficial || !whyThisEstimate) return null;

  const hasFactors =
    estimateFactors != null &&
    (estimateFactors.positive.length > 0 || estimateFactors.negative.length > 0 || estimateFactors.unknown.length > 0);

  return (
    <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
      <h3 className="text-sm font-bold">{T.whyEstimate[lang]}</h3>

      {hasFactors && (
        <ul className="mt-2.5 space-y-1.5">
          {estimateFactors!.positive.map((f, i) => (
            <li key={`p${i}`} className="flex items-start gap-2 text-sm text-[var(--gray-700)]">
              <span aria-hidden className="mt-0.5 shrink-0">🟢</span>
              <span>{f}</span>
            </li>
          ))}
          {estimateFactors!.negative.map((f, i) => (
            <li key={`n${i}`} className="flex items-start gap-2 text-sm text-[var(--gray-700)]">
              <span aria-hidden className="mt-0.5 shrink-0">🔴</span>
              <span>{f}</span>
            </li>
          ))}
          {estimateFactors!.unknown.map((f, i) => (
            <li key={`u${i}`} className="flex items-start gap-2 text-sm text-[var(--gray-500)]">
              <span aria-hidden className="mt-0.5 shrink-0">⚪</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`${ticker}-estimate-detail`}
        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
      >
        {expanded ? T.hideDetail[lang] : T.showDetail[lang]}
      </button>

      {expanded && (
        <div id={`${ticker}-estimate-detail`} className="mt-4 space-y-5">
          <p className="text-xs text-[var(--gray-500)] leading-relaxed">{whyThisEstimate}</p>

          <div>
            <div className="text-caption mb-2">{T.driversTitle[lang]}</div>
            <div className="space-y-1.5">
              {drivers.map((d) => (
                <div key={d.key} className="flex items-center justify-between text-sm border-b border-[var(--gray-100)] pb-1.5">
                  <span className="text-[var(--gray-700)]">{T.driverLabels[d.key as keyof typeof T.driverLabels]?.[lang] ?? d.key}</span>
                  <Badge variant={d.influence === "high" ? "accent" : d.influence === "unavailable" ? "neutral" : "blue"}>
                    {T.influenceLabel[d.influence][lang]}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {recentAmounts.length > 0 && (
            <div>
              <div className="text-caption mb-2">{T.recentPattern[lang]}</div>
              <div className="text-sm">
                <span className="text-[var(--gray-500)]">{T.recent3[lang]}: </span>
                <span className="font-semibold tabular-nums">
                  {recentAmounts.slice(0, 3).map((a) => `$${a.toFixed(4)}`).join(" → ")}
                </span>
              </div>
              <div className="mt-1 flex gap-6 text-sm">
                {avg4 != null && (
                  <span>
                    <span className="text-[var(--gray-500)]">{T.avg4[lang]}: </span>
                    <span className="font-semibold tabular-nums">${avg4.toFixed(4)}</span>
                  </span>
                )}
                {avg12 != null && (
                  <span>
                    <span className="text-[var(--gray-500)]">{T.avg12[lang]}: </span>
                    <span className="font-semibold tabular-nums">${avg12.toFixed(4)}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-caption mb-1.5">{T.navContext[lang]}</div>
            <p className="text-xs text-[var(--gray-500)]">{T.noNav[lang]}</p>
          </div>

          {schedulePattern && (
            <div>
              <div className="text-caption mb-1.5">{T.schedulePattern[lang]}</div>
              <div className="text-sm space-y-0.5">
                {schedulePattern.declarationWeekday && (
                  <div>
                    <span className="text-[var(--gray-500)]">{T.declaration[lang]}: </span>
                    {schedulePattern.declarationWeekday}
                  </div>
                )}
                {schedulePattern.exDividendWeekday && (
                  <div>
                    <span className="text-[var(--gray-500)]">{T.exDividend[lang]}: </span>
                    {schedulePattern.exDividendWeekday}
                  </div>
                )}
                {schedulePattern.paymentWeekday && (
                  <div>
                    <span className="text-[var(--gray-500)]">{T.payment[lang]}: </span>
                    {schedulePattern.paymentWeekday}
                  </div>
                )}
              </div>
              {!schedulePattern.isConsistent && <p className="mt-1 text-xs text-[var(--gray-400)]">{T.scheduleVaries[lang]}</p>}
            </div>
          )}

          {whatWouldChangeThis && whatWouldChangeThis.length > 0 && (
            <div>
              <div className="text-caption mb-1.5">{T.whatWouldChange[lang]}</div>
              <ul className="space-y-1 text-xs text-[var(--gray-600)] list-disc pl-4">
                {whatWouldChangeThis.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
