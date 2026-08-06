import type { LifecycleStage } from "@/lib/ticker/lifecycleStage";
import { LIFECYCLE_STAGES } from "@/lib/ticker/lifecycleStage";

const T = {
  title: { en: "ETF Lifecycle", ko: "ETF 라이프사이클" },
  stage: {
    prediction: { en: "Prediction", ko: "예측" },
    declaration: { en: "Declaration", ko: "선언" },
    "ex-date": { en: "Ex-Date", ko: "배당락일" },
    payment: { en: "Payment", ko: "지급" },
    "performance-review": { en: "Performance Review", ko: "결과 검토" },
    "next-prediction": { en: "Next Prediction", ko: "다음 예측" },
  },
} as const;

export function EtfLifecycleTimeline({ stage, lang = "en" }: { stage: LifecycleStage; lang?: "en" | "ko" }) {
  const activeIndex = LIFECYCLE_STAGES.indexOf(stage);

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white p-4">
      <div className="text-caption mb-3">{T.title[lang]}</div>
      <div className="flex items-center">
        {LIFECYCLE_STAGES.map((s, i) => {
          const reached = i <= activeIndex;
          const isActive = i === activeIndex;
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div
                  className={`relative h-3 w-3 rounded-full ${reached ? "bg-black" : "bg-[var(--gray-200)]"}`}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-[var(--crady-accent)] animate-pulse motion-reduce:animate-none"
                    />
                  )}
                </div>
                <span className={`text-[10px] text-center leading-tight ${isActive ? "font-bold text-black" : "text-[var(--gray-400)]"}`} style={{ maxWidth: 64 }}>
                  {T.stage[s][lang]}
                </span>
              </div>
              {i < LIFECYCLE_STAGES.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 ${i < activeIndex ? "bg-black" : "bg-[var(--gray-200)]"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
