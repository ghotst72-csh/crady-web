"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TickerSearch } from "./search/TickerSearch";
import { MobileSearch } from "./search/MobileSearch";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { NAV_EN, NAV_KO } from "@/lib/nav";
import type { SearchEntry } from "@/lib/search/searchTickers";

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
          {/* Desktop only — the full label set ("Dividend Calendar" etc.)
              overflows a phone-width header, so mobile gets a hamburger
              menu (MobileNav) with the same items instead (Issue 2, CRADY
              Mobile UX Final Polish report). */}
          <nav className="hidden sm:flex items-center gap-4 text-sm min-w-0">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-2 py-1.5 rounded-md text-[var(--gray-600)] hover:text-black hover:bg-[var(--gray-100)] transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Language switcher sits immediately before search on both
              desktop and mobile (Part 8). Desktop: a real, always-visible
              instant-search field. Mobile: a hamburger nav, a compact
              language menu, and a search sheet trigger — see
              components/MobileNav.tsx, components/i18n/LanguageSwitcher.tsx,
              and components/search/MobileSearch.tsx. */}
          <div className="hidden sm:block shrink-0">
            <LanguageSwitcher lang={lang} />
          </div>
          <div className="hidden sm:block w-[260px] shrink-0">
            <TickerSearch index={searchIndex} lang={lang} basePath={basePath} />
          </div>
          <div className="sm:hidden flex items-center gap-1">
            <MobileNav lang={lang} />
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
