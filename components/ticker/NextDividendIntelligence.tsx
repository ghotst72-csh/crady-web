"use client";

import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import type { DividendSchedule, DateStatus, ExpectedRange, EstimateDriver, TrackRecord, SchedulePattern } from "@/lib/ticker/nextDividendIntelligence";

/** CRADY Engagement & Intelligence Phase 2, Part A. Placed directly under
 * the Hero, before Activity/Magazine content (§1). Client component only
 * for the "Why This Estimate?" accordion — every number/string it renders
 * is server-computed real data passed in as props. */

const STATUS_LABEL: Record<DateStatus, Record<"en" | "ko", string>> = {
  official: { en: "Official", ko: "공식" },
  scheduled: { en: "Scheduled", ko: "확정 일정" },
  estimated: { en: "Estimated", ko: "예상" },
  awaiting: { en: "Awaiting Announcement", ko: "발표 대기" },
  unavailable: { en: "Unavailable", ko: "정보 없음" },
};
const STATUS_VARIANT: Record<DateStatus, BadgeVariant> = {
  official: "green",
  scheduled: "blue",
  estimated: "accent",
  awaiting: "neutral",
  unavailable: "neutral",
};
const STATUS_NOTE: Record<DateStatus, Record<"en" | "ko", string>> = {
  official: { en: "Officially declared", ko: "공식 발표됨" },
  scheduled: { en: "Official provider schedule", ko: "운용사 공식 일정" },
  estimated: { en: "Estimated from recent patterns", ko: "최근 패턴 기반 추정" },
  awaiting: { en: "Not yet available", ko: "아직 확인되지 않음" },
  unavailable: { en: "No data available", ko: "데이터 없음" },
};

const T = {
  heading: { en: "Next Dividend Intelligence", ko: "다음 배당 인텔리전스" },
  declaration: { en: "Declaration Date", ko: "배당 선언일" },
  exDividend: { en: "Ex-Dividend Date", ko: "배당락일" },
  record: { en: "Record Date", ko: "기준일" },
  payment: { en: "Payment Date", ko: "지급일" },
  estimatedDistribution: { en: "Estimated Distribution", ko: "예상 분배금" },
  officialDistribution: { en: "Official Distribution", ko: "공식 분배금" },
  perShare: { en: "per share", ko: "주당" },
  expectedRange: { en: "Expected Range", ko: "예상 범위" },
  rangeNote: { en: "Based on recent distribution variability, not a statistical model output.", ko: "최근 배당금 변동성을 기준으로 한 범위이며, 통계 모델의 신뢰구간이 아닙니다." },
  confidence: { en: "Confidence", ko: "신뢰도" },
  confidenceExplain: {
    en: "Confidence reflects the completeness and consistency of the data supporting this estimate. It is not a guarantee that the final distribution will match the forecast.",
    ko: "신뢰도는 이번 예상에 사용된 데이터의 완성도와 일관성을 나타냅니다. 실제 분배금이 예상값과 일치할 확률을 보장하는 수치는 아닙니다.",
  },
  previousDistribution: { en: "Previous Distribution", ko: "직전 분배금" },
  expectedChange: { en: "Expected Change", ko: "예상 변동" },
  whyEstimate: { en: "Why This Estimate?", ko: "왜 이렇게 예상하나요?" },
  showDetail: { en: "Show detailed basis", ko: "상세 근거 보기" },
  hideDetail: { en: "Hide detailed basis", ko: "상세 근거 숨기기" },
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
  schedulePattern: { en: "Recent Schedule Pattern", ko: "최근 일정 패턴" },
  scheduleConsistent: { en: "Consistent weekly pattern", ko: "일관된 주간 패턴" },
  scheduleVaries: { en: "This cycle's schedule pattern varies from recent history.", ko: "이번 일정은 최근 패턴과 다릅니다." },
  trackRecordTitle: { en: "CRADY Prediction Track Record", ko: "CRADY 예측 정확도 기록" },
  trackRecordCount: { en: (n: number) => `Last ${n} Predictions`, ko: (n: number) => `최근 ${n}회 예측` },
  avgError: { en: "Average Absolute Error", ko: "평균 절대 오차" },
  withinRange: { en: (a: number, b: number) => `Within ${15}% of actual: ${a} of ${b}`, ko: (a: number, b: number) => `실제값과 15% 이내 오차: ${b}회 중 ${a}회` },
  trackRecordEmpty: {
    en: "Not enough completed predictions to publish a reliable accuracy record.",
    ko: "신뢰할 수 있는 정확도 기록을 발행하기에 완료된 예측이 충분하지 않습니다.",
  },
  noEstimate: { en: "No prediction available yet for this ETF.", ko: "이 ETF에 대한 예측 정보가 아직 없습니다." },
  officialTransitionTitle: { en: "Forecast vs. Official Result", ko: "예측 대비 실제 결과" },
  forecastError: { en: "Forecast Error", ko: "예측 오차" },
} as const;

export type NextDividendIntelligenceData = {
  ticker: string;
  schedule: DividendSchedule;
  isOfficial: boolean;
  officialAmount: number | null;
  pointEstimate: number | null;
  expectedRange: ExpectedRange | null;
  confidence: number | null;
  previousAmount: number | null;
  whyThisEstimate: string;
  drivers: EstimateDriver[];
  recentAmounts: number[]; // most recent first
  avg4: number | null;
  avg12: number | null;
  schedulePattern: SchedulePattern | null;
  trackRecord: TrackRecord | null;
  forecastVsOfficial: { predictedAmount: number; actualAmount: number; errorPct: number | null } | null;
};

export function NextDividendIntelligence({
  data,
  directAnswer,
  lang = "en",
}: {
  data: NextDividendIntelligenceData;
  /** The single quotable sentence for search/AI-overview surfaces (§13) —
   * lib/ticker/nextDividendNarrative.ts's buildNextDividendDirectAnswer. */
  directAnswer?: string | null;
  lang?: "en" | "ko";
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    ticker,
    schedule,
    isOfficial,
    officialAmount,
    pointEstimate,
    expectedRange,
    confidence,
    previousAmount,
    whyThisEstimate,
    drivers,
    recentAmounts,
    avg4,
    avg12,
    schedulePattern,
    trackRecord,
    forecastVsOfficial,
  } = data;

  const hasAnyDate = [schedule.declaration, schedule.exDividend, schedule.record, schedule.payment].some((d) => d.date != null);
  if (!hasAnyDate && pointEstimate == null && !isOfficial) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 mt-6">
        <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
          <p className="mt-2 text-sm text-[var(--gray-400)]">{T.noEstimate[lang]}</p>
        </div>
      </section>
    );
  }

  const expectedChangeAmount = pointEstimate != null && previousAmount != null ? pointEstimate - previousAmount : null;
  const expectedChangePct = expectedChangeAmount != null && previousAmount != null && previousAmount > 0 ? (expectedChangeAmount / previousAmount) * 100 : null;

  return (
    <section id="next-dividend-intelligence" className="mx-auto max-w-4xl px-4 sm:px-6 mt-6 scroll-mt-4">
      <div className="border border-[var(--gray-200)] rounded-2xl p-4 sm:p-5">
        <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
        {directAnswer && <p className="mt-1.5 text-sm text-[var(--gray-600)]">{directAnswer}</p>}

        {/* Forecast vs. official — auto-transition (§8). Shown first when
            present, since a resolved comparison is more valuable than a
            still-pending estimate. */}
        {forecastVsOfficial && (
          <div className="mt-3 p-3 rounded-xl bg-[var(--gray-50)] border border-[var(--gray-200)]">
            <div className="text-caption mb-2">{T.officialTransitionTitle[lang]}</div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-[11px] text-[var(--gray-500)]">{T.officialDistribution[lang]}</div>
                <div className="font-bold tabular-nums">${forecastVsOfficial.actualAmount.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--gray-500)]">CRADY {lang === "ko" ? "예측" : "Estimate"}</div>
                <div className="font-semibold tabular-nums">${forecastVsOfficial.predictedAmount.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--gray-500)]">{T.forecastError[lang]}</div>
                <div className={`font-semibold tabular-nums ${forecastVsOfficial.actualAmount >= forecastVsOfficial.predictedAmount ? "text-emerald-700" : "text-red-700"}`}>
                  {forecastVsOfficial.errorPct != null ? `${forecastVsOfficial.errorPct.toFixed(1)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4-date breakdown */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <DateCard label={T.declaration[lang]} entry={schedule.declaration} lang={lang} />
          <DateCard label={T.exDividend[lang]} entry={schedule.exDividend} lang={lang} />
          <DateCard label={T.record[lang]} entry={schedule.record} lang={lang} />
          <DateCard label={T.payment[lang]} entry={schedule.payment} lang={lang} />
        </div>

        {/* Point estimate / range / confidence */}
        {(pointEstimate != null || isOfficial) && (
          <div className="mt-4 pt-4 border-t border-[var(--gray-200)] grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-caption">{isOfficial ? T.officialDistribution[lang] : T.estimatedDistribution[lang]}</div>
              <div className="mt-1 text-3xl font-black text-[var(--crady-accent)] tabular-nums">
                ${(isOfficial ? officialAmount! : pointEstimate!).toFixed(4)}
              </div>
              <div className="text-xs text-[var(--gray-500)]">{T.perShare[lang]}</div>
            </div>
            {!isOfficial && expectedRange && (
              <div>
                <div className="text-caption">{T.expectedRange[lang]}</div>
                <div className="mt-1 text-lg font-bold tabular-nums">
                  ${expectedRange.low.toFixed(4)} – ${expectedRange.high.toFixed(4)}
                </div>
                <div className="text-[11px] text-[var(--gray-400)] mt-0.5">{T.rangeNote[lang]}</div>
              </div>
            )}
            {!isOfficial && confidence != null && (
              <div>
                <div className="text-caption">{T.confidence[lang]}</div>
                <div className="mt-1 text-lg font-bold tabular-nums">{confidence.toFixed(0)}%</div>
                <div className="text-[11px] text-[var(--gray-400)] mt-0.5">{T.confidenceExplain[lang]}</div>
              </div>
            )}
          </div>
        )}

        {!isOfficial && pointEstimate != null && previousAmount != null && (
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-[var(--gray-500)]">{T.previousDistribution[lang]} </span>
              <span className="font-semibold tabular-nums">${previousAmount.toFixed(4)}</span>
            </span>
            {expectedChangeAmount != null && (
              <span>
                <span className="text-[var(--gray-500)]">{T.expectedChange[lang]} </span>
                <span className={`font-semibold tabular-nums ${expectedChangeAmount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {expectedChangeAmount >= 0 ? "▲ +" : "▼ "}${Math.abs(expectedChangeAmount).toFixed(4)}
                  {expectedChangePct != null && ` (${expectedChangePct >= 0 ? "+" : ""}${expectedChangePct.toFixed(1)}%)`}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Why This Estimate? accordion */}
        {!isOfficial && whyThisEstimate && (
          <div className="mt-4 pt-4 border-t border-[var(--gray-200)]">
            <h3 className="text-sm font-bold">{T.whyEstimate[lang]}</h3>
            <p className="mt-1.5 text-sm text-[var(--gray-700)] leading-relaxed">{whyThisEstimate}</p>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`${ticker}-estimate-detail`}
              className="mt-2 text-xs font-semibold text-[#92400e] hover:underline"
            >
              {expanded ? T.hideDetail[lang] : T.showDetail[lang]}
            </button>

            {expanded && (
              <div id={`${ticker}-estimate-detail`} className="mt-4 space-y-5">
                {/* Estimate drivers */}
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

                {/* Recent distribution pattern */}
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

                {/* NAV/price context — always honest since NAV data doesn't exist */}
                <div>
                  <div className="text-caption mb-1.5">{T.navContext[lang]}</div>
                  <p className="text-xs text-[var(--gray-500)]">{T.noNav[lang]}</p>
                </div>

                {/* Schedule pattern */}
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
                    {!schedulePattern.isConsistent && (
                      <p className="mt-1 text-xs text-[var(--gray-400)]">{T.scheduleVaries[lang]}</p>
                    )}
                  </div>
                )}

                {/* Prediction track record */}
                <div>
                  <div className="text-caption mb-1.5">{T.trackRecordTitle[lang]}</div>
                  {trackRecord ? (
                    <div className="text-sm space-y-0.5">
                      <div className="font-semibold">{T.trackRecordCount[lang](trackRecord.count)}</div>
                      <div>
                        <span className="text-[var(--gray-500)]">{T.avgError[lang]}: </span>
                        <span className="font-semibold tabular-nums">{trackRecord.averageAbsoluteErrorPct.toFixed(1)}%</span>
                      </div>
                      <div className="text-[var(--gray-500)]">
                        {T.withinRange[lang](trackRecord.withinRangeCount, trackRecord.count)}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--gray-400)]">{T.trackRecordEmpty[lang]}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function DateCard({ label, entry, lang }: { label: string; entry: { date: string | null; status: DateStatus }; lang: "en" | "ko" }) {
  return (
    <div className="rounded-xl border border-[var(--gray-200)] p-3">
      <div className="text-caption">{label}</div>
      <div className="mt-1 text-base font-bold tabular-nums">{entry.date ?? "—"}</div>
      <div className="mt-1.5">
        <Badge variant={STATUS_VARIANT[entry.status]}>{STATUS_LABEL[entry.status][lang]}</Badge>
      </div>
      <div className="mt-1 text-[10px] text-[var(--gray-400)]">{STATUS_NOTE[entry.status][lang]}</div>
    </div>
  );
}
