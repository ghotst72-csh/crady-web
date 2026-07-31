"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NAV_EN, NAV_KO } from "@/lib/nav";

const ARIA_LABEL: Record<"en" | "ko", string> = { en: "Open menu", ko: "메뉴 열기" };

/** Mobile-only hamburger menu (Issue 2 of the CRADY Mobile UX Final Polish
 * report): the desktop nav row (Header.tsx) overflows on narrow viewports
 * once labels like "Dividend Calendar" are in the mix, so it's hidden below
 * `sm` and replaced with this trigger instead. Same nav items (from
 * lib/nav.ts, shared with the desktop row so the two lists can't drift),
 * same dropdown-panel pattern as LanguageSwitcher (self-contained open
 * state, closes on outside pointerdown or Escape) — opening this
 * automatically closes an already-open language menu for free, since that
 * outside click fires the language menu's own close handler first. */
export function MobileNav({ lang }: { lang: "en" | "ko" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const nav = lang === "ko" ? NAV_KO : NAV_EN;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0 sm:hidden">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ARIA_LABEL[lang]}
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={ARIA_LABEL[lang]}
          className="absolute left-0 mt-1.5 w-48 rounded-xl border border-[var(--gray-200)] bg-white py-1 shadow-sm z-50"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)] hover:text-black transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
