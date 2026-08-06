import type { RiskContext } from "@/lib/ticker/riskExplain";
import { riskItemLabel, formatRiskItemValue, RISK_DISCLAIMER } from "@/lib/ticker/riskExplain";
import { HowCalculated } from "@/components/ui/HowCalculated";

const T = {
  title: { en: "Risk classification context", ko: "위험 등급 관련 데이터" },
} as const;

export function RiskExplainer({ context, lang = "en" }: { context: RiskContext | null; lang?: "en" | "ko" }) {
  if (!context) return null;
  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-2">{T.title[lang]}</div>
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
