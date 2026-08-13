import { TrendingUp, TrendingDown } from "lucide-react";
import { selectNeighbors } from "@/lib/compare/discovery";
import type { CompareEntry } from "@/lib/compare/types";
import { DiscoveryPerformerRow } from "./DiscoveryPerformerRow";

const T = {
  heading: { en: "Explore Better & Worse Performers — Same Period", ko: "같은 기간의 상위·하위 성과 ETF 살펴보기" },
  subhead: {
    en: "How the benchmark ETF performed against CRADY's full tracked universe over the exact same dates.",
    ko: "동일한 기간 동안 CRADY가 추적하는 전체 ETF 대비 기준 ETF의 성과입니다.",
  },
  benchmarkLabel: { en: "Benchmark against:", ko: "비교 기준:" },
  higher: { en: "Higher Returns", ko: "더 높은 수익률" },
  lower: { en: "Lower Returns", ko: "더 낮은 수익률" },
  rankLine: {
    en: (rank: number, total: number) => `Ranked #${rank} of ${total} tracked ETFs over this period`,
    ko: (rank: number, total: number) => `이 기간 동안 추적 ETF ${total}개 중 ${rank}위`,
  },
  insufficientNote: {
    en: (n: number) => `${n} tracked ETF${n === 1 ? "" : "s"} excluded — insufficient price history for this period.`,
    ko: (n: number) => `${n}개 ETF는 이 기간 동안 가격 데이터가 부족해 제외되었습니다.`,
  },
  noBenchmark: {
    en: "The selected benchmark couldn't be calculated for this period, so it can't be positioned here.",
    ko: "선택한 기준 ETF는 이 기간에 대해 계산할 수 없어 여기에 표시할 수 없습니다.",
  },
} as const;

export function BenchmarkDiscoverySection({
  universe,
  selectedTickers,
  benchmarkTicker,
  onBenchmarkChange,
  lang = "en",
  basePath = "",
}: {
  universe: CompareEntry[];
  selectedTickers: string[];
  benchmarkTicker: string;
  onBenchmarkChange: (ticker: string) => void;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const { benchmark, higher, lower, insufficientHistoryCount, rank, totalRanked } = selectNeighbors(
    universe,
    benchmarkTicker,
    5
  );

  return (
    <div className="rounded-2xl border border-[var(--gray-200)] p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--gray-900)]">{T.heading[lang]}</h2>
          <p className="mt-1 text-sm text-[var(--gray-500)]">{T.subhead[lang]}</p>
        </div>
        <label className="flex items-center gap-2 shrink-0 text-sm">
          <span className="font-semibold text-[var(--gray-600)] whitespace-nowrap">{T.benchmarkLabel[lang]}</span>
          <select
            value={benchmarkTicker}
            onChange={(e) => onBenchmarkChange(e.target.value)}
            className="rounded-lg border border-[var(--gray-200)] px-3 py-1.5 font-bold text-[var(--gray-900)] outline-none focus:border-blue-500"
          >
            {selectedTickers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!benchmark ? (
        <p className="mt-5 text-sm text-[var(--gray-500)]">{T.noBenchmark[lang]}</p>
      ) : (
        <div className="mt-5">
          {rank != null && (
            <p className="text-xs font-semibold text-blue-600 mb-3">{T.rankLine[lang](rank, totalRanked)}</p>
          )}

          {higher.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0ca30c] uppercase tracking-wide mb-1 px-3.5">
                <TrendingUp size={12} aria-hidden="true" />
                {T.higher[lang]}
              </div>
              {higher.map((e, i) => (
                <DiscoveryPerformerRow
                  key={e.ticker}
                  entry={e}
                  rank={rank! - higher.length + i}
                  benchmarkReturnPct={benchmark.totalReturnPct}
                  isBenchmark={false}
                  lang={lang}
                  basePath={basePath}
                />
              ))}
            </div>
          )}

          <DiscoveryPerformerRow
            entry={benchmark}
            rank={rank!}
            benchmarkReturnPct={benchmark.totalReturnPct}
            isBenchmark
            lang={lang}
            basePath={basePath}
          />

          {lower.length > 0 && (
            <div className="mt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#d03b3b] uppercase tracking-wide mb-1 mt-3 px-3.5">
                <TrendingDown size={12} aria-hidden="true" />
                {T.lower[lang]}
              </div>
              {lower.map((e, i) => (
                <DiscoveryPerformerRow
                  key={e.ticker}
                  entry={e}
                  rank={rank! + 1 + i}
                  benchmarkReturnPct={benchmark.totalReturnPct}
                  isBenchmark={false}
                  lang={lang}
                  basePath={basePath}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {insufficientHistoryCount > 0 && (
        <p className="mt-4 pt-3 border-t border-[var(--gray-100)] text-xs text-[var(--gray-400)]">
          {T.insufficientNote[lang](insufficientHistoryCount)}
        </p>
      )}
    </div>
  );
}
