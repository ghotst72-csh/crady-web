import type { ScoreBreakdown as ScoreBreakdownType } from "@/lib/ticker/scoreExplain";
import { componentLabel, buildScoreNarrative } from "@/lib/ticker/scoreExplain";
import { HowCalculated } from "@/components/ui/HowCalculated";
import { Tooltip } from "@/components/ui/Tooltip";
import { ICON } from "@/lib/ui/icons";

const T = {
  title: { en: "Why this CRADY Score?", ko: "왜 이 CRADY 점수일까요?" },
  weight: { en: "weight", ko: "가중치" },
  riskPenalty: { en: "Risk Penalty", ko: "위험 패널티" },
  defaultUsed: { en: "default used — real data not yet available", ko: "기본값 사용 — 실제 데이터 아직 없음" },
  scoreTooltip: {
    en: "A weighted score (0–100) combining dividend stability, recovery, drawdown, volatility, trend, and momentum, minus a risk-level penalty.",
    ko: "배당 안정성, 회복력, 낙폭, 변동성, 추세, 모멘텀을 가중 합산하고 위험 등급에 따른 패널티를 뺀 0~100점 점수입니다.",
  },
} as const;

export function ScoreBreakdown({ breakdown, lang = "en" }: { breakdown: ScoreBreakdownType | null; lang?: "en" | "ko" }) {
  if (!breakdown) return null;
  const narrative = buildScoreNarrative(breakdown, lang);
  const sorted = [...breakdown.components].sort((a, b) => b.points - a.points);

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-1 flex items-center">
        <span aria-hidden className="mr-1">{ICON.cradyScore}</span>
        {T.title[lang]}
        <Tooltip text={T.scoreTooltip[lang]} />
      </div>
      <div className="text-3xl font-black tabular-nums text-[var(--crady-accent)] mb-3 animate-hero-pop">
        {breakdown.liveCradyScore.toFixed(1)}
        <span className="text-sm font-semibold text-[var(--gray-400)]"> /100</span>
      </div>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.key} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-xs text-[var(--gray-600)]">
              {componentLabel(c.key, lang)}
              {c.usedDefault && <span className="ml-1 text-[var(--gray-400)]">*</span>}
            </div>
            <div className="flex-1 h-2 rounded-full bg-[var(--gray-100)] overflow-hidden">
              <div
                className="h-full bg-[var(--crady-accent)] progress-grow"
                style={{ width: `${Math.min(100, (c.points / (c.weightPct * 1)) * 100)}%` }}
              />
            </div>
            <div className="w-24 shrink-0 text-right text-xs font-bold tabular-nums">
              +{c.points.toFixed(1)} <span className="text-[var(--gray-400)] font-normal">({c.weightPct}% {T.weight[lang]})</span>
            </div>
          </div>
        ))}
        {breakdown.riskPenalty.points > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[var(--gray-100)] text-xs">
            <span className="text-[var(--gray-600)]">
              {T.riskPenalty[lang]} ({breakdown.riskPenalty.riskLevel ?? "—"})
            </span>
            <span className="font-bold text-red-700 tabular-nums">−{breakdown.riskPenalty.points}</span>
          </div>
        )}
      </div>
      {breakdown.components.some((c) => c.usedDefault) && (
        <p className="mt-2 text-[11px] text-[var(--gray-400)]">* {T.defaultUsed[lang]}</p>
      )}
      <ul className="mt-3 space-y-1.5">
        {narrative.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--gray-600)]">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--crady-accent)] shrink-0" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <HowCalculated
        formula="Dividend Stability ×35% + Recovery ×18% + Drawdown Quality ×17% + Volatility Quality ×12% + Trend ×10% + Momentum ×8% − Risk Penalty"
        dataSource={lang === "ko" ? "CRADY 데이터 파이프라인의 실제 위험 지표" : "CRADY's data pipeline's real risk metrics"}
        caveats={
          lang === "ko"
            ? "이 화면은 파이프라인의 실제 공식을 표시용으로 재현한 것입니다."
            : "This reproduces the pipeline's real formula for display — verified against live data."
        }
        lang={lang}
      />
    </div>
  );
}
