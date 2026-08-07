"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavDrawerContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const NavDrawerContext = createContext<NavDrawerContextValue | null>(null);

/** Shared open/close state for the mobile/tablet drawer — the hamburger
 * trigger lives in Header.tsx, the drawer panel is a sibling in the root
 * layout, so they need a common ancestor to coordinate through (same
 * pattern as AuthProvider/AuthModal already established in this repo). */
export function NavDrawerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [lastSeenPathname, setLastSeenPathname] = useState(pathname);

  // Close on route change — required by the phase spec ("route 이동 후
  // mobile drawer close"). Adjusted directly during render (the React-
  // documented pattern for "reset state when a prop changes") rather than
  // in an effect: an effect that calls setState synchronously on every
  // dependency change causes an extra commit-then-rerender cascade that
  // react-hooks/set-state-in-effect flags for exactly this reason — this
  // way the closed state is already correct in the very render that
  // notices the pathname changed.
  if (pathname !== lastSeenPathname) {
    setLastSeenPathname(pathname);
    if (isOpen) setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <NavDrawerContext.Provider value={{ isOpen, toggle: () => setIsOpen((o) => !o), close: () => setIsOpen(false) }}>
      {children}
    </NavDrawerContext.Provider>
  );
}

export function useNavDrawer(): NavDrawerContextValue {
  const ctx = useContext(NavDrawerContext);
  if (!ctx) throw new Error("useNavDrawer must be used within a NavDrawerProvider");
  return ctx;
}
