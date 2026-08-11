import { Target, Wallet, BarChart3, User, Newspaper, Info, Calculator, BookOpen, type LucideIcon } from "lucide-react";

/** CRADY Site Architecture Phase 1 — the single source of truth for the
 * global IA, shared verbatim by the desktop Sidebar and the mobile/tablet
 * Drawer so the two can never drift apart (a hard requirement of this
 * phase). Every `href` below is a REAL, already-existing, already-tested
 * production route — nothing here is a placeholder. Sections named in the
 * original design brief with no real destination yet (Prediction
 * Accuracy, Upcoming Announcements, Watchlist, Alerts, Screener, a
 * standalone Activity page) are deliberately absent rather than linked to
 * a stub, per the phase's explicit "no fake features" rule.
 *
 * `href` is the EN path. KO paths are derived by prefixing "/ko" (see
 * resolveHref) except where `koHref` overrides that — currently only
 * Magazine, which has no Korean route tree (see the CRADY International
 * SEO work earlier this session) and stays English-only on both sites,
 * matching the existing footer's established convention.
 *
 * A section with exactly one child renders as a single direct link (no
 * pointless single-item disclosure triangle) — see NavList's collapsing
 * logic. The data model still stores it as a full section+children shape
 * so adding a second real destination later (e.g. a real Prediction
 * Accuracy page) needs no restructuring, only a new child entry. */

export type NavChild = {
  key: string;
  label: { en: string; ko: string };
  href: string;
  koHref?: string;
};

export type NavSection = {
  key: string;
  label: { en: string; ko: string };
  icon: LucideIcon;
  children: NavChild[];
};

export const NAV_HOME: NavChild = {
  key: "home",
  label: { en: "Home", ko: "홈" },
  href: "/",
  koHref: "/ko",
};

export const NAVIGATION: NavSection[] = [
  {
    // Promoted to a top-level, always-visible destination, first in the
    // list right after Home (CRADY Homepage Final Redesign, 2026-08-12,
    // matching the approved homepage mock's exact nav order) — previously
    // nested under "High-Yield ETFs" where it wasn't immediately visible.
    // English-only (no /ko route yet — see NO_KO_EQUIVALENT in
    // lib/i18n/localePath.ts), so koHref points at the same English URL
    // rather than a /ko path that doesn't exist, same pattern as every
    // other English-only page here.
    key: "etf-calculator-top",
    label: { en: "ETF Calculator", ko: "ETF 계산기" },
    icon: Calculator,
    children: [
      { key: "etf-calculator", label: { en: "ETF Calculator", ko: "ETF 계산기" }, href: "/etf-calculator", koHref: "/etf-calculator" },
    ],
  },
  {
    // Same promotion, same reasoning, for the Covered Call Guide —
    // previously nested under "Learn" (now removed, see below).
    key: "covered-call-guide",
    label: { en: "Covered Call Guide", ko: "커버드콜 가이드" },
    icon: BookOpen,
    children: [
      {
        key: "covered-call-etf-top",
        label: { en: "What Is a Covered Call ETF?", ko: "커버드콜 ETF란?" },
        href: "/what-is-a-covered-call-etf",
        koHref: "/what-is-a-covered-call-etf",
      },
    ],
  },
  {
    key: "predictions",
    label: { en: "Dividend Predictions", ko: "배당 예측" },
    icon: Target,
    children: [{ key: "next-dividend", label: { en: "Next Dividend", ko: "다음 배당" }, href: "/next-dividend" }],
  },
  {
    key: "dividends",
    label: { en: "Dividends", ko: "배당금" },
    icon: Wallet,
    children: [
      { key: "distributions", label: { en: "Latest Distributions", ko: "최신 분배금" }, href: "/distributions" },
      { key: "archive", label: { en: "Distribution Archive", ko: "분배금 아카이브" }, href: "/distributions/archive" },
      { key: "calendar", label: { en: "Dividend Calendar", ko: "배당 캘린더" }, href: "/calendar" },
    ],
  },
  {
    key: "etfs",
    label: { en: "High-Yield ETFs", ko: "고배당 ETF" },
    icon: BarChart3,
    children: [
      { key: "ranking", label: { en: "ETF Rankings", ko: "ETF 랭킹" }, href: "/ranking" },
      { key: "compare", label: { en: "Compare ETFs", ko: "ETF 비교" }, href: "/compare" },
    ],
  },
  {
    key: "my-crady",
    label: { en: "My CRADY", ko: "내 CRADY" },
    icon: User,
    children: [{ key: "portfolio", label: { en: "Portfolio", ko: "포트폴리오" }, href: "/portfolio" }],
  },
  {
    key: "content",
    label: { en: "Content", ko: "콘텐츠" },
    icon: Newspaper,
    children: [
      { key: "magazine", label: { en: "Magazine", ko: "매거진 (영문)" }, href: "/magazine", koHref: "/magazine" },
      { key: "weekly", label: { en: "Weekly Intelligence", ko: "주간 인텔리전스" }, href: "/weekly-intelligence" },
      { key: "monthly", label: { en: "Monthly Intelligence", ko: "월간 인텔리전스" }, href: "/monthly-intelligence" },
    ],
  },
  {
    key: "about",
    label: { en: "About", ko: "소개" },
    icon: Info,
    children: [{ key: "about-crady", label: { en: "About CRADY", ko: "CRADY 소개" }, href: "/about" }],
  },
];

export function resolveHref(item: NavChild, lang: "en" | "ko"): string {
  if (lang === "en") return item.href;
  return item.koHref ?? `/ko${item.href}`;
}

/** Active-state matching: a child is active if the current pathname is
 * exactly its href, or a real sub-path of it (e.g. /distributions/[slug]
 * under "Latest Distributions") — but never for "/" itself, which would
 * otherwise match every path via a naive startsWith. */
export function isChildActive(pathname: string, href: string): boolean {
  if (href === "/" || href === "/ko") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
