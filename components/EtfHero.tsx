import Link from "next/link";
import { providerLabel } from "@/lib/data";
import { DividendStagePill } from "./DividendLifecycle";

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

// Same tint map as the homepage Hero (components/YieldCarousel.tsx) — kept
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
  lang?: "en" | "ko";
}) {
  const glow = PROVIDER_GLOW[providerId] ?? "none";
  const updatedAtLabel = formatUpdatedAt(updatedAt, lang);
  const hasPrediction =
    prediction != null &&
    (prediction.predictedAmount != null || prediction.targetPayDate != null);
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;

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
              card when there's nothing to predict yet. */}
          <div className="mt-6 pt-5 border-t border-[var(--gray-200)]">
            {hasPrediction ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
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
                      <strong className="text-[var(--crady-accent)]">
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
