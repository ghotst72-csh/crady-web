import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import type { DistributionRow } from "@/lib/distributions/table";

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

function maxBy<T>(rows: T[], key: (r: T) => number | null): T | null {
  let best: T | null = null;
  let bestVal = -Infinity;
  for (const r of rows) {
    const v = key(r);
    if (v != null && v > bestVal) {
      best = r;
      bestVal = v;
    }
  }
  return best;
}

export function DistributionKpis({ rows, lang = "en" }: { rows: DistributionRow[]; lang?: "en" | "ko" }) {
  if (rows.length === 0) return null;

  const highestDist = maxBy(rows, (r) => r.distributionPerShare);
  const highestRate = maxBy(rows, (r) => r.distributionRate);
  const highestRoc = maxBy(rows, (r) => r.rocPercent);
  const popular = POPULAR_TICKERS.map((t) => rows.find((r) => r.ticker === t)).find((r) => r != null);
  const weeklyCount = rows.filter((r) => r.frequency?.toLowerCase() === "weekly").length;
  const monthlyCount = rows.filter((r) => r.frequency?.toLowerCase() === "monthly").length;

  const items: KpiItem[] = [];
  if (highestDist) {
    items.push({
      label: T.highestDistribution[lang],
      value: highestDist.ticker,
      sublabel: `$${highestDist.distributionPerShare!.toFixed(4)}`,
      accent: true,
    });
  }
  if (highestRate) {
    items.push({
      label: T.highestRate[lang],
      value: highestRate.ticker,
      sublabel: `${highestRate.distributionRate!.toFixed(2)}%`,
      accent: true,
    });
  }
  if (highestRoc) {
    items.push({
      label: T.highestRoc[lang],
      value: highestRoc.ticker,
      sublabel: `${highestRoc.rocPercent!.toFixed(2)}%`,
    });
  }
  if (popular) {
    items.push({ label: T.mostPopular[lang], value: popular.ticker, sublabel: providerSublabel(popular) });
  }
  items.push({ label: T.weekly[lang], value: weeklyCount });
  items.push({ label: T.monthly[lang], value: monthlyCount });

  return <KpiGrid items={items} columns={3} />;
}

function providerSublabel(row: DistributionRow): string {
  return row.distributionPerShare != null ? `$${row.distributionPerShare.toFixed(4)}` : "";
}
