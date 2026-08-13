import { Crown, TriangleAlert } from "lucide-react";
import { providerLabel } from "@/lib/providers";
import type { CompareEntry } from "@/lib/compare/types";
import { SLOT_LABELS, SLOT_COLORS } from "./colors";

const T = {
  insufficientHistory: {
    en: "Not enough price history for this period — likely wasn't listed yet.",
    ko: "이 기간에 대한 가격 데이터가 부족합니다 — 아직 상장되지 않았을 수 있습니다.",
  },
  splitAnomaly: {
    en: "A stock split or reverse split was detected in this period — return withheld to avoid a misleading number.",
    ko: "이 기간 중 주식 분할/역분할이 감지되었습니다 — 잘못된 수치를 피하기 위해 결과를 표시하지 않습니다.",
  },
  invalidRange: { en: "This period could not be calculated.", ko: "이 기간은 계산할 수 없습니다." },
  totalReturn: { en: "Total Return", ko: "총수익률" },
  priceReturn: { en: "Price Return", ko: "가격수익률" },
  distributions: { en: "Total Distributions", ko: "총 분배금" },
  annualYield: { en: "Annualized Yield", ko: "연환산 배당률" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  drawdown: { en: "Max Drawdown", ko: "최대 낙폭" },
  stability: { en: "Dividend Stability", ko: "배당 안정성" },
  best: { en: "Best", ko: "최고" },
  per10k: { en: "per $10,000", ko: "($10,000 기준)" },
} as const;

const REASON_MESSAGE = {
  "insufficient-history": T.insufficientHistory,
  "split-anomaly": T.splitAnomaly,
  "invalid-range": T.invalidRange,
} as const;

function fmtPct(n: number | null, digits = 1): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
function fmtUsd(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function MetricRow({ label, value, isBest, sub }: { label: string; value: string; isBest: boolean; sub?: string; lang?: "en" | "ko" }) {
  return (
    <div className={`flex items-center justify-between gap-2 py-2 border-b border-[var(--gray-100)] last:border-0 ${isBest ? "bg-amber-50/60 -mx-3 px-3 rounded-lg" : ""}`}>
      <span className="text-xs text-[var(--gray-500)]">{label}</span>
      <span className="flex items-center gap-1 text-sm font-bold text-[var(--gray-900)] tabular-nums">
        {isBest && <Crown size={12} className="text-amber-500" aria-hidden="true" />}
        {value}
        {sub && <span className="text-[10px] font-normal text-[var(--gray-400)] ml-1">{sub}</span>}
      </span>
    </div>
  );
}

export function CompareResultCard({
  entry,
  slotIndex,
  bestTickers,
  lang = "en",
  basePath = "",
}: {
  entry: CompareEntry;
  slotIndex: number;
  bestTickers: {
    totalReturn: string | null;
    priceReturn: string | null;
    distributions: string | null;
    annualYield: string | null;
    cradyScore: string | null;
    drawdown: string | null;
    stability: string | null;
  };
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const color = SLOT_COLORS[slotIndex % SLOT_COLORS.length];
  const letter = SLOT_LABELS[slotIndex] ?? String(slotIndex + 1);
  const snapshot = entry.snapshot;

  return (
    <div className={`rounded-2xl border ${color.border} bg-white overflow-hidden`}>
      <div className={`${color.bg} px-4 py-3 flex items-center gap-2.5`}>
        <span className={`w-7 h-7 rounded-full ${color.solid} text-white text-xs font-black flex items-center justify-center shrink-0`}>
          {letter}
        </span>
        <div className="min-w-0">
          <a href={`${basePath}/${entry.ticker.toLowerCase()}`} className={`block text-sm font-black ${color.text} hover:underline truncate`}>
            {entry.ticker}
          </a>
          <div className="text-[11px] text-[var(--gray-500)] truncate">
            {snapshot ? `${providerLabel(snapshot.provider_id)}${snapshot.name ? " · " + snapshot.name : ""}` : "—"}
          </div>
        </div>
      </div>

      <div className="p-4">
        {!entry.ok ? (
          <div className="py-4 flex items-start gap-2 text-xs text-[var(--gray-600)]">
            <TriangleAlert size={16} className="shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
            <span>{REASON_MESSAGE[entry.reason][lang]}</span>
          </div>
        ) : (
          <>
            <MetricRow label={T.totalReturn[lang]} value={fmtPct(entry.totalReturnPct)} isBest={bestTickers.totalReturn === entry.ticker} />
            <MetricRow label={T.priceReturn[lang]} value={fmtPct(entry.priceReturnPct)} isBest={bestTickers.priceReturn === entry.ticker} />
            <MetricRow
              label={T.distributions[lang]}
              value={fmtUsd(entry.totalDistributionsReceived)}
              sub={T.per10k[lang]}
              isBest={bestTickers.distributions === entry.ticker}
            />
            <MetricRow
              label={T.annualYield[lang]}
              value={snapshot?.annualYieldPct != null ? `${snapshot.annualYieldPct.toFixed(1)}%` : "—"}
              isBest={bestTickers.annualYield === entry.ticker}
            />
            <MetricRow
              label={T.cradyScore[lang]}
              value={snapshot?.cradyScore != null ? snapshot.cradyScore.toFixed(1) : "—"}
              isBest={bestTickers.cradyScore === entry.ticker}
            />
            <MetricRow
              label={T.drawdown[lang]}
              value={fmtPct(entry.maxDrawdownPct)}
              isBest={bestTickers.drawdown === entry.ticker}
            />
            <MetricRow
              label={T.stability[lang]}
              value={snapshot?.dividendStabilityScore != null ? snapshot.dividendStabilityScore.toFixed(0) : "—"}
              isBest={bestTickers.stability === entry.ticker}
            />
          </>
        )}
      </div>
    </div>
  );
}
