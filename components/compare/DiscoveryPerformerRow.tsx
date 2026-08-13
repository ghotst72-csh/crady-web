import { providerLabel } from "@/lib/providers";
import type { OkCompareEntry } from "@/lib/compare/discovery";

const T = {
  benchmark: { en: "← Benchmark", ko: "← 기준" },
} as const;

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function DiscoveryPerformerRow({
  entry,
  rank,
  benchmarkReturnPct,
  isBenchmark,
  lang = "en",
  basePath = "",
}: {
  entry: OkCompareEntry;
  rank: number;
  benchmarkReturnPct: number;
  isBenchmark: boolean;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const deltaPp = entry.totalReturnPct - benchmarkReturnPct;
  return (
    <a
      href={`${basePath}/${entry.ticker.toLowerCase()}`}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
        isBenchmark ? "bg-blue-50 border border-blue-300" : "hover:bg-[var(--gray-50)]"
      }`}
    >
      <span className="w-6 shrink-0 text-xs text-[var(--gray-400)] tabular-nums">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className={`text-sm font-bold ${isBenchmark ? "text-blue-700" : "text-[var(--gray-900)]"}`}>{entry.ticker}</span>
        <span className="ml-1.5 text-[11px] text-[var(--gray-400)] truncate">
          {entry.snapshot ? providerLabel(entry.snapshot.provider_id) : ""}
        </span>
      </span>
      {!isBenchmark && (
        <span className="text-[11px] text-[var(--gray-400)] tabular-nums shrink-0">
          {deltaPp >= 0 ? "+" : ""}
          {deltaPp.toFixed(1)}pp
        </span>
      )}
      <span
        className={`text-sm font-black tabular-nums shrink-0 ${
          entry.totalReturnPct >= 0 ? "text-[#0ca30c]" : "text-[#d03b3b]"
        }`}
      >
        {fmtPct(entry.totalReturnPct)}
      </span>
      {isBenchmark && <span className="shrink-0 text-[10px] font-bold text-blue-600">{T.benchmark[lang]}</span>}
    </a>
  );
}
