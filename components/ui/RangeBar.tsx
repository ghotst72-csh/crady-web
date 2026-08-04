/** ETF Detail Page v3, requirement #5 — 52-week (or since-inception, for a
 * young ETF) high/low with a visual indicator of where the current price
 * sits between them. Pure CSS, no chart library. */

const T = {
  "52W": { en: "52-Week Range", ko: "52주 범위" },
  SINCE_INCEPTION: { en: "Range Since Inception", ko: "상장 이후 범위" },
  low: { en: "Low", ko: "최저" },
  high: { en: "High", ko: "최고" },
  current: { en: "Current", ko: "현재" },
} as const;

export function RangeBar({
  low,
  high,
  current,
  rangeLabel,
  lang = "en",
}: {
  low: number;
  high: number;
  current: number;
  rangeLabel: "52W" | "SINCE_INCEPTION";
  lang?: "en" | "ko";
}) {
  const span = high - low;
  const pct = span > 0 ? Math.min(100, Math.max(0, ((current - low) / span) * 100)) : 50;

  return (
    <div className="rounded-xl border border-[var(--gray-200)] bg-white/70 p-4">
      <div className="text-caption">{T[rangeLabel][lang]}</div>
      <div className="mt-3 relative h-1.5 rounded-full bg-[var(--gray-200)]">
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-[var(--crady-accent)] ring-2 ring-white shadow-sm"
          style={{ left: `${pct}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between text-xs tabular-nums">
        <span>
          <span className="text-[var(--gray-500)]">{T.low[lang]} </span>
          <span className="font-semibold">${low.toFixed(2)}</span>
        </span>
        <span>
          <span className="text-[var(--gray-500)]">{T.current[lang]} </span>
          <span className="font-semibold text-[#92400e]">${current.toFixed(2)}</span>
        </span>
        <span>
          <span className="text-[var(--gray-500)]">{T.high[lang]} </span>
          <span className="font-semibold">${high.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}
