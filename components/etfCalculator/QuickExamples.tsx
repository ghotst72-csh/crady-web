import { Zap, CalendarClock, Clock } from "lucide-react";

export type QuickExampleMode = "1y" | "ytd" | "3m" | "inception";

export type QuickExample = {
  key: string;
  /** A specific ticker to select, or null to apply the date-range mode to
   * whichever ticker is already selected in the calculator. */
  ticker: string | null;
  mode: QuickExampleMode;
  amount: number;
  label: string;
  sublabel: string;
};

const AVATAR_COLORS: Record<string, string> = {
  CONY: "bg-[var(--gray-900)]",
  MSTY: "bg-purple-600",
  TSLY: "bg-teal-600",
  YMAX: "bg-blue-600",
};

export const QUICK_EXAMPLES: QuickExample[] = [
  { key: "cony", ticker: "CONY", mode: "1y", amount: 10000, label: "CONY", sublabel: "1 Year · $10,000" },
  { key: "msty", ticker: "MSTY", mode: "1y", amount: 10000, label: "MSTY", sublabel: "1 Year · $10,000" },
  { key: "tsly", ticker: "TSLY", mode: "1y", amount: 10000, label: "TSLY", sublabel: "1 Year · $10,000" },
  { key: "ymax", ticker: "YMAX", mode: "ytd", amount: 10000, label: "YMAX", sublabel: "YTD · $10,000" },
  { key: "inception", ticker: null, mode: "inception", amount: 10000, label: "Since Inception", sublabel: "Inception → Today" },
  { key: "3m", ticker: null, mode: "3m", amount: 10000, label: "Last 3 Months", sublabel: "3 Months · $10,000" },
];

/** Real functional shortcuts (CRADY ETF Calculator visual refresh) — every
 * date is computed dynamically by the caller from the selected ticker's
 * actual fetched price history (see EtfCalculator.tsx's `applyQuickExample`),
 * never hard-coded. This component only renders the row and reports which
 * example was clicked. */
export function QuickExamples({
  hasSelectedTicker,
  onSelect,
}: {
  hasSelectedTicker: boolean;
  onSelect: (example: QuickExample) => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--gray-900)]">
          <Zap size={15} className="text-amber-500" aria-hidden="true" />
          Quick Examples
        </span>
        <span className="text-xs text-[var(--gray-500)]">Click any example to load automatically</span>
      </div>

      <div className="mt-3 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 sm:overflow-visible sm:flex-wrap">
        {QUICK_EXAMPLES.map((example) => {
          const disabled = example.ticker == null && !hasSelectedTicker;
          return (
            <button
              key={example.key}
              type="button"
              disabled={disabled}
              title={disabled ? "Select an ETF first" : undefined}
              onClick={() => onSelect(example)}
              className="shrink-0 w-[150px] sm:w-auto sm:flex-1 sm:min-w-[140px] flex items-center gap-2.5 rounded-xl border border-[var(--gray-200)] px-3 py-2.5 text-left hover:border-blue-300 hover:bg-blue-50/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none disabled:hover:border-[var(--gray-200)] disabled:hover:bg-transparent"
            >
              {example.ticker ? (
                <span
                  className={`shrink-0 w-8 h-8 rounded-full ${AVATAR_COLORS[example.ticker] ?? "bg-[var(--gray-700)]"} text-white flex items-center justify-center text-[10px] font-bold`}
                >
                  {example.ticker.slice(0, 2)}
                </span>
              ) : (
                <span className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  {example.mode === "inception" ? (
                    <CalendarClock size={15} aria-hidden="true" />
                  ) : (
                    <Clock size={15} aria-hidden="true" />
                  )}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[var(--gray-900)] truncate">{example.label}</span>
                <span className="block text-[11px] text-[var(--gray-500)] truncate">{example.sublabel}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[var(--gray-400)]">
        Dates are calculated dynamically. &quot;Since Inception&quot; uses the ETF&apos;s inception date.
      </p>
    </div>
  );
}
