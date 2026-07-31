import { KpiCard, type KpiItem } from "@/components/ui/KpiCard";
import { maxBy, type DistributionRow } from "@/lib/distributions/table";

const T = {
  highestDistribution: { en: "Highest Distribution", ko: "최고 분배금" },
  highestRate: { en: "Highest Distribution Rate", ko: "최고 분배율" },
  highestRoc: { en: "Highest ROC", ko: "최고 ROC" },
  mostPopular: { en: "Most Popular ETF", ko: "최고 인기 ETF" },
  weekly: { en: "Weekly ETFs", ko: "주간 지급 ETF" },
  monthly: { en: "Monthly ETFs", ko: "월간 지급 ETF" },
} as const;

// Same curated set the table's quick-access chips use (Part 2 of the
// Distribution Center spec) — an editorial "most popular" pick, not a data
// integrity claim; the table itself never restricts to just these four.
const POPULAR_TICKERS = ["MSTY", "TSLY", "CONY", "NVDY"];

/** Three deliberate size tiers instead of six identical cards (Visual
 * Hierarchy Phase 2, Part 1): the two dollar-figure records the reader
 * cares most about get large cards, the two "which ETF" facts get medium
 * cards, and the two plain counts — useful but the least decision-relevant
 * numbers on the page — get small cards. Stacked rows rather than one
 * uniform grid, since a 2/2/2 pyramid doesn't fit a single column count. */
export function DistributionKpis({ rows, lang = "en" }: { rows: DistributionRow[]; lang?: "en" | "ko" }) {
  if (rows.length === 0) return null;

  const highestDist = maxBy(rows, (r) => r.distributionPerShare);
  const highestRate = maxBy(rows, (r) => r.distributionRate);
  const highestRoc = maxBy(rows, (r) => r.rocPercent);
  const popular = POPULAR_TICKERS.map((t) => rows.find((r) => r.ticker === t)).find((r) => r != null);
  const weeklyCount = rows.filter((r) => r.frequency?.toLowerCase() === "weekly").length;
  const monthlyCount = rows.filter((r) => r.frequency?.toLowerCase() === "monthly").length;

  const large: KpiItem[] = [];
  if (highestDist) {
    large.push({
      label: T.highestDistribution[lang],
      value: highestDist.ticker,
      sublabel: `$${highestDist.distributionPerShare!.toFixed(4)}`,
      accent: true,
    });
  }
  if (highestRate) {
    large.push({
      label: T.highestRate[lang],
      value: highestRate.ticker,
      sublabel: `${highestRate.distributionRate!.toFixed(2)}%`,
      accent: true,
    });
  }

  const medium: KpiItem[] = [];
  if (highestRoc) {
    medium.push({
      label: T.highestRoc[lang],
      value: highestRoc.ticker,
      sublabel: `${highestRoc.rocPercent!.toFixed(2)}%`,
    });
  }
  if (popular) {
    medium.push({ label: T.mostPopular[lang], value: popular.ticker, sublabel: providerSublabel(popular) });
  }

  const small: KpiItem[] = [
    { label: T.weekly[lang], value: weeklyCount },
    { label: T.monthly[lang], value: monthlyCount },
  ];

  return (
    <div className="flex flex-col gap-3">
      {large.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {large.map((item) => (
            <KpiCard key={item.label} {...item} size="lg" />
          ))}
        </div>
      )}
      {medium.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {medium.map((item) => (
            <KpiCard key={item.label} {...item} size="md" />
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {small.map((item) => (
          <KpiCard key={item.label} {...item} size="sm" />
        ))}
      </div>
    </div>
  );
}

function providerSublabel(row: DistributionRow): string {
  return row.distributionPerShare != null ? `$${row.distributionPerShare.toFixed(4)}` : "";
}
