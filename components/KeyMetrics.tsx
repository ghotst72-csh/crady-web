import Link from "next/link";
import type { KeyMetrics as KeyMetricsData } from "@/lib/data";

const T = {
  today: { en: "Paying Today", ko: "오늘 지급 예정" },
  thisWeek: { en: "Paying This Week", ko: "이번 주 지급 예정" },
  predictions: { en: "Next Dividends Tracked", ko: "다음 예상 배당 등록" },
  highScore: { en: "CRADY Score 70+", ko: "CRADY 70점 이상" },
} as const;

export function KeyMetrics({
  metrics,
  lang = "en",
  basePath = "",
}: {
  metrics: KeyMetricsData;
  lang?: "en" | "ko";
  basePath?: string;
}) {
  const items = [
    { label: T.today[lang], value: metrics.todayCount, href: `${basePath}/calendar` },
    { label: T.thisWeek[lang], value: metrics.weekCount, href: `${basePath}/calendar` },
    { label: T.predictions[lang], value: metrics.nextPredictionCount, href: `${basePath}/ranking` },
    { label: T.highScore[lang], value: metrics.highScoreCount, href: `${basePath}/ranking` },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="border border-[var(--gray-200)] rounded-xl px-4 py-3 hover:border-black transition-colors"
          >
            <div className="text-2xl font-extrabold">{item.value}</div>
            <div className="text-xs text-[var(--gray-500)] mt-0.5">
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
