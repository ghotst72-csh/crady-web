import Link from "next/link";
import type { NextDistributionEntry } from "@/lib/data";
import { formatConfidencePct } from "@/lib/confidence";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const T = {
  heading: { en: "Next Predicted Distributions", ko: "다음 예상 분배금" },
  sub: {
    en: "Soonest expected payment date first",
    ko: "예상 지급일이 빠른 순",
  },
  more: { en: "More →", ko: "더 보기 →" },
  duePaying: { en: "Paying Now", ko: "지급 예정" },
  predictedDividend: { en: "Predicted Dividend", ko: "예상 분배금" },
  confirmed: { en: "Confirmed", ko: "확정" },
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
          href={`${basePath}/next-dividend`}
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
              {/* Medium — ticker + D-day, not the loudest thing on the card
                  anymore (Visual Hierarchy: numbers dominate, Part 9). */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-base">{etf.ticker}</span>
                <span className="text-[10px] font-bold text-[#92400e] shrink-0">
                  {dDay <= 0 ? T.duePaying[lang] : `D-${dDay}`}
                </span>
              </div>

              {/* Largest — the predicted dividend amount is the card's whole
                  reason to exist, so it gets the dominant type. */}
              <div className="mt-2.5">
                <div className="text-3xl font-black text-[#92400e] tabular-nums leading-none">
                  ${etf.nextPredictedAmount!.toFixed(4)}
                </div>
                <div className="text-[11px] text-[var(--gray-500)] mt-1">
                  {T.predictedDividend[lang]} · {etf.nextPredictedDate}
                </div>
              </div>

              {/* Smallest — confidence and the confirmed-vs-predicted
                  comparison are supporting context, not headline numbers. */}
              <div className="mt-3 pt-2.5 border-t border-[var(--gray-100)] text-[11px] text-[var(--gray-500)]">
                <div>
                  {T.confirmed[lang]}{" "}
                  {etf.latestDividend != null ? `$${etf.latestDividend.toFixed(4)}` : "—"}
                  {etf.changeFromLastPct != null && (
                    <span>
                      {" "}
                      ({T.vsLast[lang]} {etf.changeFromLastPct >= 0 ? "+" : ""}
                      {etf.changeFromLastPct.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <div className="mt-0.5">
                  {etf.nextPredictedConfidence != null
                    ? `${T.confidence[lang]} ${formatConfidencePct(etf.nextPredictedConfidence, 0)}`
                    : T.awaiting[lang]}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
