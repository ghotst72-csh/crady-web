const T = {
  annualYield: { en: "Annualized Yield", ko: "연환산 분배율" },
  distributions12m: { en: "12M Distributions", ko: "12개월 분배금" },
  frequency: { en: "Distribution Frequency", ko: "배당 주기" },
  cradyScore: { en: "CRADY Score", ko: "CRADY 점수" },
  stability: { en: "Dividend Stability", ko: "배당 안정성" },
  risk: { en: "Risk", ko: "위험도" },
  na: "—",
} as const;

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

/** CRADY Phase 3 — Summary tab's small, deliberately restrained metrics
 * row (spec §3.4): six numbers, not a dashboard. Every value is already
 * computed elsewhere on the page — this component adds no calculation of
 * its own, purely presentation. */
export function EtfSummaryMetrics({
  annualYieldPct,
  distributions12mTotal,
  payoutFrequency,
  cradyScore,
  dividendStabilityScore,
  riskLevel,
  lang = "en",
}: {
  annualYieldPct: number | null;
  distributions12mTotal: number | null;
  payoutFrequency: string | null;
  cradyScore: number | null;
  dividendStabilityScore: number | null;
  riskLevel: string | null;
  lang?: "en" | "ko";
}) {
  const riskLabel = riskLevel ? (RISK_LABEL[lang][riskLevel] ?? riskLevel) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <Metric label={T.annualYield[lang]} value={annualYieldPct != null ? `${annualYieldPct.toFixed(1)}%` : T.na} accent />
      <Metric label={T.distributions12m[lang]} value={distributions12mTotal != null ? `$${distributions12mTotal.toFixed(4)}` : T.na} />
      <Metric
        label={T.frequency[lang]}
        value={payoutFrequency && payoutFrequency.toLowerCase() !== "unknown" ? payoutFrequency : T.na}
      />
      <Metric label={T.cradyScore[lang]} value={cradyScore != null ? cradyScore.toFixed(1) : T.na} accent />
      <Metric label={T.stability[lang]} value={dividendStabilityScore != null ? dividendStabilityScore.toFixed(1) : T.na} />
      <Metric label={T.risk[lang]} value={riskLabel ?? T.na} />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--gray-200)] rounded-xl p-3">
      <div className="text-[11px] text-[var(--gray-500)] leading-tight">{label}</div>
      <div className={`mt-1 text-lg font-extrabold tabular-nums ${accent ? "text-[var(--crady-accent)]" : ""}`}>{value}</div>
    </div>
  );
}
