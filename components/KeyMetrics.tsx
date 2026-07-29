import Link from "next/link";
import type { KeyMetrics as KeyMetricsData } from "@/lib/data";

export function KeyMetrics({ metrics }: { metrics: KeyMetricsData }) {
  const items = [
    {
      label: "오늘 지급 예정",
      value: metrics.todayCount,
      href: "/calendar",
    },
    {
      label: "이번 주 지급 예정",
      value: metrics.weekCount,
      href: "/calendar",
    },
    {
      label: "다음 예상 배당 등록",
      value: metrics.nextPredictionCount,
      href: "/ranking",
    },
    {
      label: "CRADY 70점 이상",
      value: metrics.highScoreCount,
      href: "/ranking",
    },
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
