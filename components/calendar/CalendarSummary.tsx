import { KpiCard, type KpiItem } from "@/components/ui/KpiCard";

const T = {
  today: { en: "Today's Payments", ko: "오늘 지급" },
  thisWeek: { en: "This Week", ko: "이번 주" },
  nextExDividend: { en: "Next Ex-Dividend", ko: "다음 배당락일" },
  predictions: { en: "Upcoming Predictions", ko: "다음 예상 배당" },
  officialAnnounced: { en: "Recently Announced", ko: "최근 발표" },
  officialSub: { en: "official distribution", ko: "공식 분배금" },
} as const;

/** Today's Payments dominates, This Week is secondary, everything else is
 * tertiary (Visual Hierarchy Phase 2, Part 5) — the calendar's whole job is
 * answering "what's happening right now," so today's count gets a full-width
 * large card of its own rather than sharing equal billing with five others. */
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
  const secondary: KpiItem[] = [{ label: T.thisWeek[lang], value: weekCount }];
  if (nextExDividend) {
    secondary.push({
      label: T.nextExDividend[lang],
      value: nextExDividend.ticker,
      sublabel: nextExDividend.exDate,
      href: `${basePath}/${nextExDividend.ticker.toLowerCase()}`,
    });
  }

  const tertiary: KpiItem[] = [{ label: T.predictions[lang], value: predictionCount, href: `${basePath}/ranking` }];
  if (latestAnnouncement) {
    tertiary.push({
      label: T.officialAnnounced[lang],
      value: latestAnnouncement.etfCount,
      sublabel: `${T.officialSub[lang]} · ${latestAnnouncement.date}`,
      href: `${basePath}/distributions`,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <KpiCard label={T.today[lang]} value={todayCount} accent size="lg" />
      <div className="grid grid-cols-2 gap-3">
        {secondary.map((item) => (
          <KpiCard key={item.label} {...item} size="md" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tertiary.map((item) => (
          <KpiCard key={item.label} {...item} size="sm" />
        ))}
      </div>
    </div>
  );
}
