"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TickerSearch } from "./search/TickerSearch";
import { MobileSearch } from "./search/MobileSearch";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import type { SearchEntry } from "@/lib/search/searchTickers";

// Magazine is English-only (no /ko/magazine — see the CRADY International
// SEO report), so its nav link never gets the /ko prefix even on the
// Korean header.
const NAV_EN = [
  { href: "/ranking", label: "Ranking" },
  { href: "/calendar", label: "Dividend Calendar" },
  { href: "/magazine", label: "Magazine" },
  { href: "/about", label: "About" },
];

const NAV_KO = [
  { href: "/ko/ranking", label: "랭킹" },
  { href: "/ko/calendar", label: "배당 일정" },
  { href: "/magazine", label: "매거진" },
  { href: "/ko/about", label: "소개" },
];

// Scroll direction thresholds — small jitters (<10px) don't trigger a
// show/hide flip, and the header always shows within 20px of the top.
const MOVE_THRESHOLD = 10;
const TOP_LOCK = 20;

export function Header({
  lang = "en",
  searchIndex,
}: {
  lang?: "en" | "ko";
  searchIndex: SearchEntry[];
}) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const accum = useRef(0);
  const focusLocked = useRef(false);

  const nav = lang === "ko" ? NAV_KO : NAV_EN;
  const basePath = lang === "ko" ? "/ko" : "";
  const homeHref = lang === "ko" ? "/ko" : "/";

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      if (focusLocked.current) return;
      const y = window.scrollY;

      if (y < TOP_LOCK) {
        setHidden(false);
        lastY.current = y;
        accum.current = 0;
        return;
      }

      const delta = y - lastY.current;
      // Reset the accumulator when direction flips so a wobble doesn't
      // carry leftover momentum from the opposite direction.
      if ((delta > 0 && accum.current < 0) || (delta < 0 && accum.current > 0)) {
        accum.current = 0;
      }
      accum.current += delta;

      if (accum.current > MOVE_THRESHOLD) {
        setHidden(true);
        accum.current = 0;
      } else if (accum.current < -MOVE_THRESHOLD) {
        setHidden(false);
        accum.current = 0;
      }
      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-[var(--gray-200)] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          hidden ? "-translate-y-full" : "translate-y-0"
        }`}
        onFocusCapture={() => {
          focusLocked.current = true;
          setHidden(false);
        }}
        onBlurCapture={() => {
          focusLocked.current = false;
        }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href={homeHref} className="font-bold text-lg tracking-tight shrink-0">
            {/* #92400e — see the CRADY Authority & Google Trust Phase 1
                report for the WCAG contrast fix behind this exact value. */}
            CRA<span className="text-[#92400e]">DY</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-4 text-xs sm:text-sm min-w-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-1.5 sm:px-2 py-1.5 rounded-md text-[var(--gray-600)] hover:text-black hover:bg-[var(--gray-100)] transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Language switcher sits immediately before search on both
              desktop and mobile (Part 8). Desktop: a real, always-visible
              instant-search field. Mobile: icons that open a full-width
              search sheet / a compact language menu — see
              components/search/MobileSearch.tsx and
              components/i18n/LanguageSwitcher.tsx. */}
          <div className="hidden sm:block shrink-0">
            <LanguageSwitcher lang={lang} />
          </div>
          <div className="hidden sm:block w-[260px] shrink-0">
            <TickerSearch index={searchIndex} lang={lang} basePath={basePath} />
          </div>
          <div className="sm:hidden flex items-center">
            <LanguageSwitcher lang={lang} compact />
            <MobileSearch index={searchIndex} lang={lang} basePath={basePath} />
          </div>
        </div>
      </header>
      {/* Spacer so fixed header doesn't overlap page content — keeps layout
          height stable regardless of hidden/shown state. */}
      <div className="h-14" />
    </>
  );
}
