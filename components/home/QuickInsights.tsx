import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import type { EtfSnapshot } from "@/lib/data";

const T = {
  heading: { en: "Quick Insights", ko: "빠른 인사이트" },
  sub: {
    en: "The whole tracked market, in six facts.",
    ko: "추적 중인 시장 전체를 6가지 사실로.",
  },
  avgYield: { en: "Average Yield", ko: "평균 분배율" },
  highestRisk: { en: "Highest Risk", ko: "최고 위험" },
  lowestRisk: { en: "Lowest Risk", ko: "최저 위험" },
  mostStable: { en: "Most Stable ETF", ko: "가장 안정적인 ETF" },
  mostPopular: { en: "Most Popular", ko: "인기 ETF" },
  upcomingDividend: { en: "Upcoming Dividend", ko: "다음 배당 지급" },
  na: "—",
} as const;

const RISK_RANK: Record<string, number> = { SAFE: 0, NORMAL: 1, RISKY: 2, EXTREME: 3 };
const POPULAR_TICKERS = ["MSTY", "TSLY", "CONY", "NVDY"];

/** A second, differently-scoped dashboard from MarketSummary (which is
 * built entirely from the latest OFFICIAL announcement's rows) — these six
 * facts are computed across the whole tracked snapshot, so together the
 * two sections answer both "what did the issuers just announce" and
 * "what does the whole market look like right now" (Web UX/SEO Phase 2,
 * Part 7). */
export function QuickInsights({
  snapshot,
  lang = "en",
  basePath = "",
}: {
  snapshot: EtfSnapshot[];
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const yields = snapshot.filter((e) => e.annualYieldPct != null).map((e) => e.annualYieldPct!);
  const avgYield = yields.length > 0 ? yields.reduce((a, b) => a + b, 0) / yields.length : null;

  const withRisk = snapshot.filter((e) => e.riskLevel && RISK_RANK[e.riskLevel] != null);
  const highestRisk = withRisk.length > 0 ? withRisk.reduce((a, b) => (RISK_RANK[b.riskLevel!] > RISK_RANK[a.riskLevel!] ? b : a)) : null;
  const lowestRisk = withRisk.length > 0 ? withRisk.reduce((a, b) => (RISK_RANK[b.riskLevel!] < RISK_RANK[a.riskLevel!] ? b : a)) : null;

  const withStability = snapshot.filter((e) => e.dividendStabilityScore != null);
  const mostStable = withStability.length > 0 ? withStability.reduce((a, b) => (b.dividendStabilityScore! > a.dividendStabilityScore! ? b : a)) : null;

  const popular = POPULAR_TICKERS.map((t) => snapshot.find((e) => e.ticker === t)).find((e) => e != null);

  const withNextPay = snapshot.filter((e) => e.nextPredictedDate != null);
  const upcoming = withNextPay.length > 0 ? withNextPay.reduce((a, b) => (b.nextPredictedDate! < a.nextPredictedDate! ? b : a)) : null;

  const items: KpiItem[] = [
    { label: T.avgYield[lang], value: avgYield != null ? `${avgYield.toFixed(1)}%` : T.na, href: `${basePath}/ranking` },
    {
      label: T.highestRisk[lang],
      value: highestRisk?.ticker ?? T.na,
      href: highestRisk ? `${basePath}/${highestRisk.ticker.toLowerCase()}` : undefined,
    },
    {
      label: T.lowestRisk[lang],
      value: lowestRisk?.ticker ?? T.na,
      href: lowestRisk ? `${basePath}/${lowestRisk.ticker.toLowerCase()}` : undefined,
    },
    {
      label: T.mostStable[lang],
      value: mostStable?.ticker ?? T.na,
      sublabel: mostStable?.dividendStabilityScore != null ? `${mostStable.dividendStabilityScore.toFixed(1)}/100` : undefined,
      href: mostStable ? `${basePath}/${mostStable.ticker.toLowerCase()}` : undefined,
    },
    {
      label: T.mostPopular[lang],
      value: popular?.ticker ?? T.na,
      href: popular ? `${basePath}/${popular.ticker.toLowerCase()}` : undefined,
    },
    {
      label: T.upcomingDividend[lang],
      value: upcoming?.ticker ?? T.na,
      sublabel: upcoming?.nextPredictedDate ?? undefined,
      href: upcoming ? `${basePath}/${upcoming.ticker.toLowerCase()}` : undefined,
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-8 border-t border-[var(--gray-200)]">
      <h2 className="text-lg font-bold">{T.heading[lang]}</h2>
      <p className="text-xs text-[var(--gray-500)] mt-0.5 mb-4">{T.sub[lang]}</p>
      <KpiGrid items={items} columns={3} />
    </section>
  );
}
