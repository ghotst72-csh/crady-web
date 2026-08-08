import { Percent, Receipt, CalendarDays, Gauge, Shield, FileText } from "lucide-react";

const T = {
  annualYield: { en: "Annualized Yield", ko: "연환산 분배율" },
  distributions12m: { en: "12M Total Distributions", ko: "12개월 총 분배금" },
  frequency: { en: "Dividend Frequency", ko: "배당 주기" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  stability: { en: "Dividend Stability", ko: "배당 안정성" },
  expenseRatio: { en: "Expense Ratio", ko: "운용 보수" },
  na: "—",
} as const;

const ICON_PROPS = { size: 14, strokeWidth: 2, className: "text-[var(--gray-400)]" } as const;

function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** CRADY ETF Detail UI (reference-locked) — Summary's six-card metrics
 * row, exactly the reference's six metrics (Annualized Yield / 12M Total
 * Distributions / Dividend Frequency / CRADY Score / Dividend Stability /
 * Expense Ratio — not the same set as any earlier phase's metrics row).
 * Every value is already computed elsewhere on the page — purely
 * presentation, no calculation of its own. */
export function EtfSummaryMetrics({
  annualYieldPct,
  distributions12mTotal,
  payoutFrequency,
  cradyScore,
  dividendStabilityScore,
  expenseRatio,
  lang = "en",
}: {
  annualYieldPct: number | null;
  distributions12mTotal: number | null;
  payoutFrequency: string | null;
  cradyScore: number | null;
  dividendStabilityScore: number | null;
  expenseRatio: string | null;
  lang?: "en" | "ko";
}) {
  const stabilityLabel =
    dividendStabilityScore == null
      ? null
      : dividendStabilityScore >= 70
        ? { en: "High", ko: "높음" }[lang]
        : dividendStabilityScore >= 40
          ? { en: "Medium", ko: "보통" }[lang]
          : { en: "Low", ko: "낮음" }[lang];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Metric icon={<Percent {...ICON_PROPS} />} label={T.annualYield[lang]} value={annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : T.na} accent />
      <Metric
        icon={<Receipt {...ICON_PROPS} />}
        label={T.distributions12m[lang]}
        value={distributions12mTotal != null ? `$${distributions12mTotal.toFixed(4)}` : T.na}
      />
      <Metric
        icon={<CalendarDays {...ICON_PROPS} />}
        label={T.frequency[lang]}
        value={payoutFrequency && payoutFrequency.toLowerCase() !== "unknown" ? capitalize(payoutFrequency) : T.na}
      />
      <Metric icon={<Gauge {...ICON_PROPS} />} label={T.cradyScore[lang]} value={cradyScore != null ? `${cradyScore.toFixed(1)} / 100` : T.na} accent />
      <Metric icon={<Shield {...ICON_PROPS} />} label={T.stability[lang]} value={stabilityLabel ?? T.na} />
      <Metric icon={<FileText {...ICON_PROPS} />} label={T.expenseRatio[lang]} value={expenseRatio && expenseRatio.toLowerCase() !== "unknown" ? expenseRatio : T.na} />
    </div>
  );
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      </div>
      <div className={`mt-1.5 text-lg font-bold tabular-nums ${accent ? "text-[#92400e]" : ""}`}>{value}</div>
    </div>
  );
}
