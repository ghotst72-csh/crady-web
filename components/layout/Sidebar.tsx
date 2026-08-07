import { NavList } from "./NavList";

/** Wide-desktop persistent sidebar — visible at `xl:` (1280px) and up,
 * hidden below that in favor of the hamburger + MobileDrawer (Header.tsx
 * decides the hamburger's visibility with the exact same breakpoint, so
 * the two can never show at once or leave a gap where neither shows).
 * `sticky` under the fixed header, its own independent scroll if the IA
 * ever grows taller than the viewport — never scrolls the page, never
 * covers content (requirement §7). */
export function Sidebar({ lang = "en" }: { lang?: "en" | "ko" }) {
  return (
    <aside
      className="hidden xl:block w-[236px] shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto border-r border-[var(--gray-200)] px-3 py-5"
      aria-label={lang === "ko" ? "사이드바" : "Sidebar"}
    >
      <NavList lang={lang} />
    </aside>
  );
}
