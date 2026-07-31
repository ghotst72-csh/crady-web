import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";
import { maxBy, type DistributionRow } from "@/lib/distributions/table";

const T = {
  heading: { en: "Today's Market", ko: "오늘의 시장" },
  sub: {
    en: "The latest official distribution data, in six numbers — open this like you'd open Bloomberg in the morning.",
    ko: "최신 공식 분배금 데이터를 6개의 숫자로 — 아침에 블룸버그를 열어보듯 확인하세요.",
  },
  officialAnnouncements: { en: "Official Distributions", ko: "공식 분배 발표" },
  todaysPayments: { en: "ETFs Paying Today", ko: "오늘 지급 ETF" },
  thisWeek: { en: "Paying This Week", ko: "이번 주 지급" },
  highestYield: { en: "Highest Yield", ko: "최고 분배율" },
  highestAmount: { en: "Highest Distribution", ko: "최고 분배금" },
  averageYield: { en: "Average Yield", ko: "평균 분배율" },
} as const;

/** "Today's Market" (Homepage Phase 4, Part 1) — six KPI cards, no table,
 * every one drawn from the latest real official announcement rows (not the
 * Hero's own model-computed run-rate yield, which is a deliberately
 * different, complementary number — this is the officially disclosed
 * distribution rate and per-share amount). */
export function MarketSummary({
  announcementRows,
  announcementCount,
  todayCount,
  weekCount,
  lang = "en",
  basePath = "",
}: {
  announcementRows: DistributionRow[];
  announcementCount: number | null;
  todayCount: number;
  weekCount: number;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const highestRate = maxBy(announcementRows, (r) => r.distributionRate);
  const highestAmount = maxBy(announcementRows, (r) => r.distributionPerShare);
  const rates = announcementRows.filter((r) => r.distributionRate != null).map((r) => r.distributionRate!);
  const averageRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null;

  const items: KpiItem[] = [
    {
      label: T.officialAnnouncements[lang],
      value: announcementCount ?? "—",
      href: `${basePath}/distributions`,
    },
    { label: T.todaysPayments[lang], value: todayCount, href: `${basePath}/calendar` },
    { label: T.thisWeek[lang], value: weekCount, href: `${basePath}/calendar` },
    {
      label: T.highestYield[lang],
      value: highestRate ? `${highestRate.distributionRate!.toFixed(1)}%` : "—",
      sublabel: highestRate?.ticker,
      accent: true,
      href: `${basePath}/distributions`,
    },
    {
      label: T.highestAmount[lang],
      value: highestAmount ? `$${highestAmount.distributionPerShare!.toFixed(4)}` : "—",
      sublabel: highestAmount?.ticker,
      href: `${basePath}/distributions`,
    },
    {
      label: T.averageYield[lang],
      value: averageRate != null ? `${averageRate.toFixed(1)}%` : "—",
      href: `${basePath}/distributions`,
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
