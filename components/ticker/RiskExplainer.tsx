import type { RiskContext } from "@/lib/ticker/riskExplain";
import { riskItemLabel, formatRiskItemValue, RISK_DISCLAIMER } from "@/lib/ticker/riskExplain";
import { HowCalculated } from "@/components/ui/HowCalculated";
import { Tooltip } from "@/components/ui/Tooltip";
import { ICON } from "@/lib/ui/icons";

const T = {
  title: { en: "Risk classification context", ko: "위험 등급 관련 데이터" },
  riskTooltip: {
    en: "A category label from CRADY's data pipeline — see the note below for what it is and isn't based on.",
    ko: "CRADY 데이터 파이프라인이 제공하는 분류 라벨입니다 — 산출 근거는 아래 참고 사항을 확인하세요.",
  },
} as const;

const RISK_LABEL: Record<"en" | "ko", Record<string, string>> = {
  en: { SAFE: "Safe", NORMAL: "Normal", RISKY: "Risky", EXTREME: "Extreme" },
  ko: { SAFE: "안정", NORMAL: "보통", RISKY: "위험", EXTREME: "고위험" },
};

const RISK_COLOR: Record<string, string> = {
  SAFE: "text-emerald-700",
  NORMAL: "text-[var(--gray-900)]",
  RISKY: "text-[#92400e]",
  EXTREME: "text-red-700",
};

export function RiskExplainer({ context, lang = "en" }: { context: RiskContext | null; lang?: "en" | "ko" }) {
  if (!context) return null;
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-1 flex items-center">
        <span aria-hidden className="mr-1">{ICON.risk}</span>
        {T.title[lang]}
        <Tooltip text={T.riskTooltip[lang]} />
      </div>
      <div className={`text-3xl font-black tabular-nums mb-3 animate-hero-pop ${RISK_COLOR[context.riskLevel] ?? ""}`}>
        {RISK_LABEL[lang][context.riskLevel] ?? context.riskLevel}
      </div>
      {context.items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {context.items.map((item) => (
            <div key={item.key}>
              <div className="text-[11px] text-[var(--gray-500)]">{riskItemLabel(item.key, lang)}</div>
              <div className="text-sm font-bold tabular-nums">{formatRiskItemValue(item)}</div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--gray-500)] leading-relaxed">{RISK_DISCLAIMER[lang]}</p>
      <HowCalculated
        formula={lang === "ko" ? "표시된 지표는 CRADY 파이프라인이 산출한 실제 값입니다." : "The metrics shown are real values computed by CRADY's data pipeline."}
        dataSource={lang === "ko" ? "변동성, 최대 낙폭, 배당 안정성 데이터" : "Volatility, max drawdown, and dividend stability data"}
        caveats={RISK_DISCLAIMER[lang]}
        lang={lang}
      />
    </div>
  );
}
