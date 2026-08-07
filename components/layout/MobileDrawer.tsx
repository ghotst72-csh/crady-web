"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useNavDrawer } from "./NavDrawerProvider";
import { NavList } from "./NavList";

const T = {
  menu: { en: "Menu", ko: "메뉴" },
  close: { en: "Close menu", ko: "메뉴 닫기" },
} as const;

/** The off-canvas drawer shown below `xl:` (tablet + mobile) — same IA as
 * the desktop Sidebar via the shared NavList, per the phase's explicit
 * "menu names/grouping must never differ between modes" requirement.
 * ESC and outside-click (backdrop) both close it; NavDrawerProvider
 * already handles body-scroll-lock and close-on-route-change. */
export function MobileDrawer({ lang = "en" }: { lang?: "en" | "ko" }) {
  const { isOpen, close } = useNavDrawer();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="xl:hidden fixed inset-0 z-[60]">
      {/* Mouse/touch-only dismiss target — intentionally not a labeled,
          focusable control. Keyboard users close via Escape or the
          visible X button below, both of which already have a single,
          unambiguous accessible name; a second "Close menu" label on an
          invisible full-screen backdrop would only compete with it. */}
      <div aria-hidden="true" onClick={close} className="absolute inset-0 bg-black/30" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={T.menu[lang]}
        className="absolute left-0 top-0 h-full w-[82vw] max-w-[320px] bg-white shadow-xl flex flex-col"
      >
        <div className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[var(--gray-200)]">
          <span className="font-bold text-lg tracking-tight">
            CRA<span className="text-[#92400e]">DY</span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label={T.close[lang]}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--gray-600)] hover:bg-[var(--gray-100)] transition-colors"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList lang={lang} onNavigate={close} />
        </div>
      </div>
    </div>
  );
}
