"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useAuth } from "./AuthProvider";

const T = {
  signIn: { en: "Sign in", ko: "로그인" },
  signOut: { en: "Sign out", ko: "로그아웃" },
  menuLabel: { en: "Account menu", ko: "계정 메뉴" },
} as const;

/** Sits beside LanguageSwitcher/TickerSearch (xl:+) and the hamburger/
 * MobileSearch trio (below xl:) in Header.tsx — not inside the nav
 * drawer, matching the site's pattern of small icon-button siblings in
 * the header row rather than growing the drawer. */
export function AuthStatus({ lang = "en" }: { lang?: "en" | "ko" }) {
  const { session, loading, openAuthModal } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (loading) {
    return <div className="w-9 h-9" aria-hidden />;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={openAuthModal}
        className="px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] hover:text-black rounded-full hover:bg-[var(--gray-100)] transition-colors"
      >
        {T.signIn[lang]}
      </button>
    );
  }

  const initial = (session.user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={T.menuLabel[lang]}
        onClick={() => setMenuOpen((o) => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[var(--gray-100)] text-sm font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-200)] transition-colors"
      >
        {initial}
      </button>

      {menuOpen && (
        <div
          role="menu"
          aria-label={T.menuLabel[lang]}
          className="absolute right-0 mt-1.5 w-40 rounded-xl border border-[var(--gray-200)] bg-white py-1 shadow-sm z-50"
        >
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              const supabase = createBrowserSupabaseClient();
              await supabase.auth.signOut();
              setMenuOpen(false);
            }}
            className="w-full text-left flex items-center px-3 py-2 text-sm text-[var(--gray-700)] hover:bg-[var(--gray-50)] hover:text-black transition-colors"
          >
            {T.signOut[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
