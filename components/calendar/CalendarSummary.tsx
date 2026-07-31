import { KpiGrid, type KpiItem } from "@/components/ui/KpiCard";

const T = {
  today: { en: "Today's Payments", ko: "오늘 지급" },
  thisWeek: { en: "This Week", ko: "이번 주" },
  nextExDividend: { en: "Next Ex-Dividend", ko: "다음 배당락일" },
  predictions: { en: "Upcoming Predictions", ko: "다음 예상 배당" },
  officialAnnounced: { en: "Recently Announced", ko: "최근 발표" },
  officialSub: { en: "official distribution", ko: "공식 분배금" },
} as const;

export function CalendarSummary({
  todayCount,
  weekCount,
  predictionCount,
  nextExDividend,
  latestAnnouncement,
  lang = "en",
  basePath = "",
}: {
  todayCount: number;
  weekCount: number;
  predictionCount: number;
  nextExDividend: { ticker: string; exDate: string } | null;
  latestAnnouncement: { etfCount: number; date: string } | null;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const items: KpiItem[] = [
    { label: T.today[lang], value: todayCount, accent: true },
    { label: T.thisWeek[lang], value: weekCount },
    { label: T.predictions[lang], value: predictionCount, href: `${basePath}/ranking` },
  ];
  if (nextExDividend) {
    items.push({
      label: T.nextExDividend[lang],
      value: nextExDividend.ticker,
      sublabel: nextExDividend.exDate,
      href: `${basePath}/${nextExDividend.ticker.toLowerCase()}`,
    });
  }
  if (latestAnnouncement) {
    items.push({
      label: T.officialAnnounced[lang],
      value: latestAnnouncement.etfCount,
      sublabel: `${T.officialSub[lang]} · ${latestAnnouncement.date}`,
      href: `${basePath}/distributions`,
    });
  }

  return <KpiGrid items={items} columns={3} />;
}
