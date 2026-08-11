"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { TickerSearch } from "./search/TickerSearch";
import { MobileSearch } from "./search/MobileSearch";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { AuthStatus } from "./auth/AuthStatus";
import { useNavDrawer } from "./layout/NavDrawerProvider";
import { Logo } from "./branding/Logo";
import type { SearchEntry } from "@/lib/search/searchTickers";

// Scroll direction thresholds — small jitters (<10px) don't trigger a
// show/hide flip, and the header always shows within 20px of the top.
const MOVE_THRESHOLD = 10;
const TOP_LOCK = 20;

const T = { openMenu: { en: "Open menu", ko: "메뉴 열기" } } as const;

/** CRADY Site Architecture Phase 1 — the header no longer carries the
 * global nav links (previously a `<nav>` row that overflowed at
 * 1280-1440px once an 8th item was added — see the Next Dividend Hub
 * report). Navigation now lives entirely in Sidebar.tsx (xl:+ persistent)
 * and MobileDrawer.tsx (below xl:, opened from the hamburger below), both
 * driven by the single shared IA in lib/navigation.ts. The header's job
 * is just identity + search + language + account, at every width. */
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
  const { toggle } = useNavDrawer();

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
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Hamburger — opens MobileDrawer, hidden once the persistent
              Sidebar takes over at xl:. Never both visible, never a gap
              where neither is (Sidebar.tsx uses the identical xl: cut). */}
          <button
            type="button"
            onClick={toggle}
            aria-label={T.openMenu[lang]}
            className="xl:hidden w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors shrink-0"
          >
            <Menu size={20} strokeWidth={2} aria-hidden="true" />
          </button>

          <Link href={homeHref} className="shrink-0">
            <Logo variant="horizontal" size="md" showTagline />
          </Link>

          <div className="flex-1" />

          {/* Always-visible desktop trio, once the Sidebar is showing
              (xl:+) — no nav links here anymore, so there's no overflow
              budget to fight over. Search sits in its own centered zone
              (CRADY Homepage Final Redesign, 2026-08-12 — matching the
              approved header proportions) between two equal flex spacers,
              wider than before so it reads as the header's primary
              action, not an afterthought beside the account menu. Below
              xl:, the compact mobile row (hamburger already rendered above
              + language + search-sheet trigger + account) takes over
              instead. */}
          <div className="hidden xl:block w-full max-w-md shrink-0">
            <TickerSearch index={searchIndex} lang={lang} basePath={basePath} />
          </div>
          <div className="flex-1" />
          <div className="hidden xl:flex items-center gap-2 shrink-0">
            <LanguageSwitcher lang={lang} />
            <AuthStatus lang={lang} />
          </div>
          <div className="xl:hidden flex items-center gap-1">
            <LanguageSwitcher lang={lang} compact />
            <MobileSearch index={searchIndex} lang={lang} basePath={basePath} />
            <AuthStatus lang={lang} />
          </div>
        </div>
      </header>
      {/* Spacer so fixed header doesn't overlap page content — keeps layout
          height stable regardless of hidden/shown state. */}
      <div className="h-14" />
    </>
  );
}
