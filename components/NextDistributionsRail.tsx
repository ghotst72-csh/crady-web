import Link from "next/link";
import type { NextDistributionEntry } from "@/lib/data";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const T = {
  heading: { en: "Next Estimated Distributions", ko: "다음 예상 분배금" },
  sub: {
    en: "Soonest expected payment date first · Confirmed (last actual) → Predicted (next expected)",
    ko: "예상 지급일이 빠른 순 · 확정(직전 실지급) → 예측(다음 예상)",
  },
  more: { en: "More →", ko: "더 보기 →" },
  duePaying: { en: "Paying Now", ko: "지급 예정" },
  confirmed: { en: "Confirmed", ko: "확정" },
  predicted: { en: "Predicted", ko: "예측" },
  vsLast: { en: "vs last", ko: "직전 대비" },
  noComparison: { en: "No comparison data", ko: "비교 데이터 없음" },
  confidence: { en: "confidence", ko: "신뢰도" },
  awaiting: { en: "Awaiting forecast", ko: "예측 대기" },
} as const;

export function NextDistributionsRail({
  items,
  lang = "en",
  basePath = "",
}: {
  items: NextDistributionEntry[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">{T.sub[lang]}</p>
        </div>
        <Link
          href={`${basePath}/ranking`}
          className="text-sm text-[var(--gray-500)] hover:text-black shrink-0"
        >
          {T.more[lang]}
        </Link>
      </div>

      {/* Horizontal timeline — natively swipeable, connecting line implies date flow */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((etf) => {
          const dDay = daysUntil(etf.nextPredictedDate!);
          return (
            <Link
              key={etf.ticker}
              href={`${basePath}/${etf.ticker.toLowerCase()}`}
              className="snap-start shrink-0 w-[220px] border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors relative"
            >
              <div className="text-xs font-bold text-[var(--crady-accent)]">
                {dDay <= 0 ? T.duePaying[lang] : `D-${dDay}`}
                <span className="text-[var(--gray-400)] font-normal ml-1">
                  {etf.nextPredictedDate}
                </span>
              </div>
              <div className="mt-2 font-bold text-lg">{etf.ticker}</div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <div>
                  <div className="text-[10px] text-[var(--gray-400)]">{T.confirmed[lang]}</div>
                  <div className="font-semibold text-[var(--gray-700)]">
                    {etf.latestDividend != null
                      ? `$${etf.latestDividend.toFixed(4)}`
                      : "—"}
                  </div>
                </div>
                <span className="text-[var(--gray-300)]">→</span>
                <div>
                  <div className="text-[10px] text-[var(--crady-accent)]">{T.predicted[lang]}</div>
                  <div className="font-bold text-[var(--crady-accent)] border border-dashed border-[var(--crady-accent)] rounded px-1.5">
                    ${etf.nextPredictedAmount!.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[var(--gray-500)]">
                <span>
                  {etf.changeFromLastPct != null
                    ? `${T.vsLast[lang]} ${etf.changeFromLastPct >= 0 ? "+" : ""}${etf.changeFromLastPct.toFixed(1)}%`
                    : T.noComparison[lang]}
                </span>
                <span>
                  {etf.nextPredictedConfidence != null
                    ? `${T.confidence[lang]} ${etf.nextPredictedConfidence.toFixed(0)}%`
                    : T.awaiting[lang]}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
