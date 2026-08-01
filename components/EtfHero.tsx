import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { DividendStagePill } from "./DividendLifecycle";
import { Sparkline } from "./ui/Sparkline";
import type { TrendWindow } from "@/lib/magazine/trend";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

// Same tint map as the homepage Hero (components/home/Hero.tsx) — kept
// as a small local copy rather than a shared import since it's 3 lines and
// pulling in the client Hero component here would drag its "use client"
// boundary into this server component for no reason.
const PROVIDER_GLOW: Record<string, string> = {
  yieldmax: "radial-gradient(60% 100% at 15% 20%, rgba(245,158,11,0.07), transparent 70%)",
  roundhill: "radial-gradient(60% 100% at 15% 20%, rgba(59,130,246,0.07), transparent 70%)",
  defiance: "radial-gradient(60% 100% at 15% 20%, rgba(34,197,94,0.07), transparent 70%)",
};

function formatUpdatedAt(iso: string | null, lang: "en" | "ko"): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

const T = {
  yieldLabel: { en: "Annual Distribution Yield", ko: "연환산 분배율" },
  updated: { en: "Updated", ko: "업데이트" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  recentDividend: { en: "Recent Dividend", ko: "최근 배당금" },
  nextPayDate: { en: "Next Dividend", ko: "다음 지급일" },
  tbd: { en: "TBD", ko: "미정" },
  frequency: { en: "Dividend Frequency", ko: "배당 주기" },
  risk: { en: "Risk", ko: "위험도" },
  stability: { en: "Dividend Stability", ko: "배당 안정성" },
  nextExpected: { en: "Next expected dividend", ko: "다음 예상 배당" },
  vsLast: { en: "vs last", ko: "직전 대비" },
  confidence: { en: "confidence", ko: "신뢰도" },
  noPrediction: {
    en: "No prediction available yet.",
    ko: "아직 예측 데이터가 없습니다.",
  },
  viewHistory: { en: "View Dividend History ↓", ko: "배당 내역 보기 ↓" },
  dueToday: { en: "Paying today", ko: "오늘 지급" },
  daysLeft: { en: (n: number) => `D-${n}`, ko: (n: number) => `D-${n}` },
  recentPayments: { en: "Last 3 Payments", ko: "최근 3회 지급" },
  trend12mo: { en: "12-Month Trend", ko: "최근 12개월 추세" },
  payments: { en: "payments", ko: "회" },
  upDown: { en: (up: number, down: number) => `${up}↑ / ${down}↓`, ko: (up: number, down: number) => `${up}↑ / ${down}↓` },
  avgChange: { en: "avg. change per payment", ko: "지급당 평균 변동" },
} as const;

export function EtfHero({
  ticker,
  name,
  providerId,
  category,
  riskLevel,
  updatedAt,
  yieldPct,
  cradyScore,
  dividendStabilityScore,
  payoutFrequency,
  latestDividend,
  prediction,
  changeFromLastPct,
  recentPayments = [],
  trend12mo = null,
  lang = "en",
}: {
  ticker: string;
  name: string | null;
  providerId: string;
  category: string | null;
  riskLevel: string | null;
  updatedAt: string | null;
  yieldPct: number | null;
  cradyScore: number | null;
  dividendStabilityScore: number | null;
  payoutFrequency: string | null;
  latestDividend: { amount: number; payDate: string } | null;
  prediction: {
    targetPayDate: string | null;
    targetExDate: string | null;
    predictedAmount: number | null;
    confidenceScore: number | null;
  } | null;
  changeFromLastPct: number | null;
  /** Last 3 actual payments, most recent first — for the at-a-glance
   * "recent activity" strip (Web UX/SEO Phase 2, Part 4). */
  recentPayments?: { amount: number | null; payDate: string }[];
  /** The 365-day window from lib/magazine/trend.ts's computeDividendTrend —
   * reused as-is rather than recomputed, so the Hero's trend figure can
   * never drift from the Magazine system's own trend numbers. */
  trend12mo?: TrendWindow | null;
  lang?: "en" | "ko";
}) {
  const glow = PROVIDER_GLOW[providerId] ?? "none";
  const updatedAtLabel = formatUpdatedAt(updatedAt, lang);
  const hasPrediction =
    prediction != null &&
    (prediction.predictedAmount != null || prediction.targetPayDate != null);
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;
  const dDay = prediction?.targetPayDate ? daysUntil(prediction.targetPayDate) : null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-6">
      <div className="relative border border-[var(--gray-200)] rounded-2xl overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: glow }}
          aria-hidden
        />
        <div className="relative p-5 sm:p-8">
          {/* ETF identity */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{ticker}</h1>
            {name && (
              <span className="text-sm sm:text-base text-[var(--gray-500)]">{name}</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)] font-medium">
              {providerLabel(providerId)}
            </span>
            {category && (
              <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                {category}
              </span>
            )}
            {riskLabel && (
              <span className="px-2 py-1 rounded-full bg-[var(--gray-100)] text-[var(--gray-600)]">
                {riskLabel}
              </span>
            )}
            {updatedAtLabel && (
              <span className="text-[var(--gray-400)] ml-auto">
                {updatedAtLabel} KST {T.updated[lang]}
              </span>
            )}
          </div>

          {/* Headline number — same visual weight as the homepage Hero */}
          <div className="mt-6 sm:mt-8">
            <div className="text-5xl sm:text-7xl font-black text-[var(--crady-accent)] tabular-nums leading-none">
              {yieldPct != null ? `${yieldPct.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 text-sm font-semibold text-[var(--gray-600)]">
              {lang === "ko" ? (
                <>
                  연환산 분배율{" "}
                  <span className="font-normal text-[var(--gray-400)]">
                    Annual Distribution Yield
                  </span>
                </>
              ) : (
                T.yieldLabel.en
              )}
            </div>
          </div>

          {/* KPI grid — everything a "MSST ETF" search visitor needs, above
              the fold, no scrolling required. */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard
              label={T.cradyScore[lang]}
              englishLabel={lang === "ko" ? "CRADY Score" : undefined}
              value={cradyScore != null ? cradyScore.toFixed(1) : "—"}
              accent
            />
            <KpiCard
              label={T.recentDividend[lang]}
              englishLabel={lang === "ko" ? "Recent Dividend" : undefined}
              value={latestDividend ? `$${latestDividend.amount.toFixed(4)}` : "—"}
              sub={latestDividend?.payDate}
            />
            <KpiCard
              label={T.nextPayDate[lang]}
              englishLabel={lang === "ko" ? "Next Dividend" : undefined}
              value={prediction?.targetPayDate ?? T.tbd[lang]}
            />
            <KpiCard
              label={T.frequency[lang]}
              englishLabel={lang === "ko" ? "Dividend Frequency" : undefined}
              value={
                payoutFrequency && payoutFrequency.toLowerCase() !== "unknown"
                  ? payoutFrequency
                  : "—"
              }
            />
            <KpiCard
              label={T.risk[lang]}
              englishLabel={lang === "ko" ? "Risk" : undefined}
              value={riskLabel ?? "—"}
            />
            <KpiCard
              label={T.stability[lang]}
              englishLabel={lang === "ko" ? "Dividend Stability" : undefined}
              value={
                dividendStabilityScore != null ? dividendStabilityScore.toFixed(1) : "—"
              }
            />
          </div>

          {/* Next predicted dividend — a compact line, never a large empty
              card when there's nothing to predict yet. D-Day countdown is
              the first thing in the row so "how soon" reads immediately. */}
          <div className="mt-6 pt-5 border-t border-[var(--gray-200)]">
            {hasPrediction ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
                {dDay != null && (
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-black text-white text-xs font-bold tabular-nums">
                    {dDay <= 0 ? T.dueToday[lang] : T.daysLeft[lang](dDay)}
                  </span>
                )}
                {prediction!.targetExDate && prediction!.targetPayDate && (
                  <DividendStagePill
                    exDate={prediction!.targetExDate}
                    payDate={prediction!.targetPayDate}
                    lang={lang}
                  />
                )}
                <span className="text-[var(--gray-700)]">
                  {T.nextExpected[lang]}{" "}
                  {prediction!.targetPayDate && (
                    <>
                      <strong className="font-semibold">{prediction!.targetPayDate}</strong>{" "}
                    </>
                  )}
                  {prediction!.predictedAmount != null && (
                    <>
                      {/* #92400e, not --crady-accent — see components/ui/KpiCard.tsx for why. */}
                      <strong className="text-[#92400e]">
                        ${prediction!.predictedAmount.toFixed(4)}
                      </strong>{" "}
                    </>
                  )}
                  {lang === "ko" ? "예상" : "expected"}
                  {changeFromLastPct != null &&
                    ` (${T.vsLast[lang]} ${changeFromLastPct > 0 ? "+" : ""}${changeFromLastPct.toFixed(1)}%)`}
                  {prediction!.confidenceScore != null &&
                    ` · ${T.confidence[lang]} ${prediction!.confidenceScore.toFixed(0)}%`}
                </span>
              </div>
            ) : (
              <p className="text-sm text-[var(--gray-400)]">{T.noPrediction[lang]}</p>
            )}
          </div>

          {/* Recent activity strip — last 3 actual payments (with
              payment-over-payment deltas) and the 12-month trend, so "has
              this ETF's dividend been rising or falling" reads at a glance
              without scrolling to the history table (Part 4). */}
          {(recentPayments.length > 0 || (trend12mo && trend12mo.count > 0)) && (
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {recentPayments.length > 0 && (
                <div className="border border-[var(--gray-200)] rounded-xl p-3 bg-white/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide">
                      {T.recentPayments[lang]}
                    </div>
                    <Sparkline
                      values={[...recentPayments].reverse().map((p) => p.amount)}
                      color="auto"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {recentPayments.map((p, i) => {
                      const prior = recentPayments[i + 1]?.amount ?? null;
                      const delta = p.amount != null && prior != null ? p.amount - prior : null;
                      return (
                        <span key={p.payDate} className="tabular-nums">
                          <span className="text-[var(--gray-500)]">{p.payDate.slice(5)}</span>{" "}
                          <span
                            className={`font-semibold ${
                              delta != null && delta > 0
                                ? "text-emerald-700"
                                : delta != null && delta < 0
                                  ? "text-red-700"
                                  : ""
                            }`}
                          >
                            {p.amount != null ? `$${p.amount.toFixed(4)}` : "—"}
                            {delta != null && delta !== 0 && (delta > 0 ? " ▲" : " ▼")}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {trend12mo && trend12mo.count > 0 && (
                <div className="border border-[var(--gray-200)] rounded-xl p-3 bg-white/70">
                  <div className="text-[11px] font-semibold text-[var(--gray-500)] uppercase tracking-wide mb-1.5">
                    {T.trend12mo[lang]}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold tabular-nums">
                      <span className="text-emerald-700">{trend12mo.increases}↑</span>
                      {" / "}
                      <span className="text-red-700">{trend12mo.decreases}↓</span>
                    </span>{" "}
                    <span className="text-[var(--gray-500)]">
                      · {trend12mo.count} {T.payments[lang]}
                    </span>
                    {trend12mo.avgChangePct != null && (
                      <div className="text-xs text-[var(--gray-500)] mt-0.5">
                        {trend12mo.avgChangePct > 0 ? "+" : ""}
                        {trend12mo.avgChangePct.toFixed(1)}% {T.avgChange[lang]}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            href="#dividend-history"
            className="mt-6 inline-flex items-center justify-center px-5 py-2.5 bg-black text-white rounded-lg text-sm font-semibold hover:bg-[var(--gray-900)] transition-colors"
          >
            {T.viewHistory[lang]}
          </Link>
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  englishLabel,
  value,
  sub,
  accent,
}: {
  label: string;
  englishLabel?: string;
  value: string;
  sub?: string | null;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/70 border border-[var(--gray-200)] p-3">
      <div className="text-[11px] text-[var(--gray-500)] font-medium leading-tight">
        {label}
      </div>
      {englishLabel && (
        <div className="text-[9px] text-[var(--gray-400)] leading-tight">{englishLabel}</div>
      )}
      <div
        className={`mt-1 text-lg font-extrabold tabular-nums ${
          accent ? "text-[var(--crady-accent)]" : ""
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-[var(--gray-400)] mt-0.5">{sub}</div>}
    </div>
  );
}
