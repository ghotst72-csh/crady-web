import Link from "next/link";
import type { NextDistributionEntry } from "@/lib/data";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function NextDistributionsRail({
  items,
}: {
  items: NextDistributionEntry[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold">다음 예상 분배금</h2>
          <p className="text-xs text-[var(--gray-500)] mt-0.5">
            예상 지급일이 빠른 순 · 확정(직전 실지급) → 예측(다음 예상)
          </p>
        </div>
        <Link
          href="/ranking"
          className="text-sm text-[var(--gray-500)] hover:text-black shrink-0"
        >
          더 보기 →
        </Link>
      </div>

      {/* Horizontal timeline — natively swipeable, connecting line implies date flow */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {items.map((etf) => {
          const dDay = daysUntil(etf.nextPredictedDate!);
          return (
            <Link
              key={etf.ticker}
              href={`/${etf.ticker.toLowerCase()}`}
              className="snap-start shrink-0 w-[220px] border border-[var(--gray-200)] rounded-xl p-4 hover:border-black transition-colors relative"
            >
              <div className="text-xs font-bold text-[var(--crady-accent)]">
                {dDay <= 0 ? "지급 예정" : `D-${dDay}`}
                <span className="text-[var(--gray-400)] font-normal ml-1">
                  {etf.nextPredictedDate}
                </span>
              </div>
              <div className="mt-2 font-bold text-lg">{etf.ticker}</div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                <div>
                  <div className="text-[10px] text-[var(--gray-400)]">확정</div>
                  <div className="font-semibold text-[var(--gray-700)]">
                    {etf.latestDividend != null
                      ? `$${etf.latestDividend.toFixed(4)}`
                      : "—"}
                  </div>
                </div>
                <span className="text-[var(--gray-300)]">→</span>
                <div>
                  <div className="text-[10px] text-[var(--crady-accent)]">예측</div>
                  <div className="font-bold text-[var(--crady-accent)] border border-dashed border-[var(--crady-accent)] rounded px-1.5">
                    ${etf.nextPredictedAmount!.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-[var(--gray-500)]">
                <span>
                  {etf.changeFromLastPct != null
                    ? `직전 대비 ${etf.changeFromLastPct >= 0 ? "+" : ""}${etf.changeFromLastPct.toFixed(1)}%`
                    : "비교 데이터 없음"}
                </span>
                <span>
                  {etf.nextPredictedConfidence != null
                    ? `신뢰도 ${etf.nextPredictedConfidence.toFixed(0)}%`
                    : "예측 대기"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
