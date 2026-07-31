export type NavItem = { href: string; label: string };

// Magazine is English-only (no /ko/magazine — see the CRADY International
// SEO report), so its nav link never gets the /ko prefix even on the
// Korean header. Shared between the desktop nav row (Header.tsx) and the
// mobile hamburger menu (MobileNav.tsx) so the two can't drift apart.
export const NAV_EN: NavItem[] = [
  { href: "/ranking", label: "Ranking" },
  { href: "/calendar", label: "Dividend Calendar" },
  { href: "/magazine", label: "Magazine" },
  { href: "/about", label: "About" },
];

export const NAV_KO: NavItem[] = [
  { href: "/ko/ranking", label: "랭킹" },
  { href: "/ko/calendar", label: "배당 일정" },
  { href: "/magazine", label: "매거진" },
  { href: "/ko/about", label: "소개" },
];
