import Link from "next/link";
import { CalendarClock, TrendingUp, Target, Megaphone, Calculator, BookOpen, ArrowRight, type LucideIcon } from "lucide-react";

const T = {
  nextDistributions: {
    title: { en: "Next Distributions", ko: "다음 분배금" },
    body: { en: "Upcoming payments at a glance", ko: "다가오는 지급 한눈에 보기" },
  },
  highestYields: {
    title: { en: "Highest Yields", ko: "최고 배당률" },
    body: { en: "Top ETFs by distribution yield", ko: "배당률 상위 ETF" },
  },
  predictions: {
    title: { en: "CRADY Predictions", ko: "CRADY 예측" },
    body: { en: "Our AI-powered dividend predictions", ko: "AI 기반 배당 예측" },
  },
  recentlyAnnounced: {
    title: { en: "Recently Announced", ko: "최근 발표" },
    body: { en: "Latest distribution announcements", ko: "최신 분배금 발표" },
  },
  calculator: {
    title: { en: "ETF Calculator", ko: "ETF 계산기" },
    body: { en: "Calculate returns and total income", ko: "수익률과 총소득 계산" },
  },
  guide: {
    title: { en: "Covered Call Guide", ko: "커버드콜 가이드" },
    body: { en: "Learn covered call strategies", ko: "커버드콜 전략 배우기" },
  },
} as const;

type Tile = { key: keyof typeof T; icon: LucideIcon; href: string; koHref?: string };

// ETF Calculator and the Covered Call Guide have no /ko route (see
// NO_KO_EQUIVALENT in lib/i18n/localePath.ts) — koHref pins those two
// tiles to the plain English URL instead of a naive `/ko` prefix that
// would 404, reusing the exact same resolution rule as lib/navigation.ts.
const TILES: Tile[] = [
  { key: "nextDistributions", icon: CalendarClock, href: "/calendar" },
  { key: "highestYields", icon: TrendingUp, href: "/ranking" },
  { key: "predictions", icon: Target, href: "/next-dividend" },
  { key: "recentlyAnnounced", icon: Megaphone, href: "/distributions" },
  { key: "calculator", icon: Calculator, href: "/etf-calculator", koHref: "/etf-calculator" },
  { key: "guide", icon: BookOpen, href: "/what-is-a-covered-call-etf", koHref: "/what-is-a-covered-call-etf" },
];

/** 6 instant-navigation shortcuts (CRADY Homepage Final Redesign,
 * 2026-08-12) — every href is an existing production route, no new pages.
 * ETF Calculator / Covered Call Guide duplicate their sidebar entries
 * intentionally: Image 1's design gives both a homepage entry point too,
 * not just a nav link. */
export function QuickActions({ lang = "en", basePath = "" }: { lang?: "en" | "ko"; basePath?: string }) {
  return (
    <section className="mt-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {TILES.map((tile) => {
        const { key, icon: Icon, href, koHref } = tile;
        const copy = T[key];
        const resolvedHref = lang === "en" ? href : (koHref ?? `${basePath}${href}`);
        return (
          <Link
            key={key}
            href={resolvedHref}
            className="group relative rounded-xl border border-[var(--gray-200)] bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <span className="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="mt-3 text-sm font-bold text-[var(--gray-900)]">{copy.title[lang]}</div>
            <p className="mt-0.5 text-xs text-[var(--gray-500)] leading-snug">{copy.body[lang]}</p>
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="absolute bottom-3.5 right-3.5 text-[var(--gray-300)] group-hover:text-blue-600 transition-colors"
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </section>
  );
}
