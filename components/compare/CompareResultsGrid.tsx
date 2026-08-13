import { pickBestTicker } from "@/lib/compare/calculations";
import type { CompareEntry } from "@/lib/compare/types";
import { CompareResultCard } from "./CompareResultCard";

const T = {
  heading: { en: "Results", ko: "결과" },
  period: { en: (s: string, e: string) => `${s} → ${e}`, ko: (s: string, e: string) => `${s} → ${e}` },
} as const;

// Static class map — Tailwind's JIT scanner needs literal strings, not a
// template-built "lg:grid-cols-" + n.
const GRID_COLS_CLASS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function CompareResultsGrid({
  entries,
  startDate,
  endDate,
  lang = "en",
  basePath = "",
}: {
  entries: CompareEntry[];
  startDate: string;
  endDate: string;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const okEntries = entries.filter((e): e is Extract<CompareEntry, { ok: true }> => e.ok);

  const bestTickers = {
    totalReturn: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.totalReturnPct }))),
    priceReturn: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.priceReturnPct }))),
    distributions: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.totalDistributionsReceived }))),
    annualYield: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.snapshot?.annualYieldPct ?? null }))),
    cradyScore: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.snapshot?.cradyScore ?? null }))),
    drawdown: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.maxDrawdownPct }))),
    stability: pickBestTicker(okEntries.map((e) => ({ ticker: e.ticker, value: e.snapshot?.dividendStabilityScore ?? null }))),
  };

  const gridColsClass = GRID_COLS_CLASS[entries.length] ?? "lg:grid-cols-5";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-black text-[var(--gray-900)]">{T.heading[lang]}</h2>
        <span className="text-xs text-[var(--gray-500)] tabular-nums">{T.period[lang](startDate, endDate)}</span>
      </div>

      {/* Below lg: horizontal-scroll cards. At lg and up: full grid. Same
          cards rendered in both blocks (cheap — max 5), toggled purely by
          CSS display utilities so there's no JS/hydration branching. */}
      <div className={`lg:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0`}>
        {entries.map((entry, i) => (
          <div key={entry.ticker + i} className="shrink-0 w-[85vw] max-w-[320px] snap-start">
            <CompareResultCard entry={entry} slotIndex={i} bestTickers={bestTickers} lang={lang} basePath={basePath} />
          </div>
        ))}
      </div>
      <div className={`hidden lg:grid grid-cols-1 ${gridColsClass} gap-4`}>
        {entries.map((entry, i) => (
          <CompareResultCard key={entry.ticker + i} entry={entry} slotIndex={i} bestTickers={bestTickers} lang={lang} basePath={basePath} />
        ))}
      </div>
    </div>
  );
}
