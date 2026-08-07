"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Home as HomeIcon } from "lucide-react";
import { NAVIGATION, NAV_HOME, resolveHref, isChildActive } from "@/lib/navigation";

/** The single IA renderer shared by the desktop Sidebar and the mobile/
 * tablet Drawer (Sidebar.tsx / MobileDrawer.tsx) — the phase's explicit
 * requirement is that menu names/grouping never differ between them, and
 * the only reliable way to guarantee that is one component, not two
 * hand-kept-in-sync copies.
 *
 * A section with exactly one real child (Dividend Predictions, My CRADY,
 * About today) renders as a single direct link using the section's own
 * icon+label — no pointless one-item disclosure triangle. A section with
 * 2+ children renders as an expandable group, expanded by default (the
 * full IA is short enough — ~15 rows total — that hiding it behind a
 * click by default would cost more than it saves), auto-expanded whenever
 * it contains the active page. */
export function NavList({ lang = "en", onNavigate }: { lang?: "en" | "ko"; basePath?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const homeHref = resolveHref(NAV_HOME, lang);
  const homeActive = isChildActive(pathname, homeHref);

  return (
    <nav aria-label={lang === "ko" ? "주요 메뉴" : "Main navigation"} className="flex flex-col gap-0.5">
      <Link
        href={homeHref}
        onClick={onNavigate}
        aria-current={homeActive ? "page" : undefined}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-colors ${
          homeActive ? "bg-[var(--gray-100)] text-black" : "text-[var(--gray-700)] hover:bg-[var(--gray-50)] hover:text-black"
        }`}
      >
        <HomeIcon size={17} strokeWidth={2} aria-hidden="true" />
        {NAV_HOME.label[lang]}
      </Link>

      <div className="h-2" aria-hidden="true" />

      {NAVIGATION.map((section) => (
        <NavSectionItem key={section.key} section={section} lang={lang} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function NavSectionItem({
  section,
  lang,
  pathname,
  onNavigate,
}: {
  section: (typeof NAVIGATION)[number];
  lang: "en" | "ko";
  pathname: string;
  onNavigate?: () => void;
}) {
  const Icon = section.icon;
  const anyChildActive = section.children.some((c) => isChildActive(pathname, resolveHref(c, lang)));
  const [expanded, setExpanded] = useState(true);

  if (section.children.length === 1) {
    const child = section.children[0];
    const href = resolveHref(child, lang);
    const active = isChildActive(pathname, href);
    return (
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-colors ${
          active ? "bg-[var(--gray-100)] text-black" : "text-[var(--gray-700)] hover:bg-[var(--gray-50)] hover:text-black"
        }`}
      >
        <Icon size={17} strokeWidth={2} aria-hidden="true" />
        {section.label[lang]}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold text-[var(--gray-700)] hover:bg-[var(--gray-50)] hover:text-black transition-colors"
      >
        <Icon size={17} strokeWidth={2} className={anyChildActive ? "text-[#92400e]" : ""} aria-hidden="true" />
        <span className={anyChildActive ? "text-black" : ""}>{section.label[lang]}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={`ml-auto text-[var(--gray-400)] transition-transform ${expanded ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div className="mt-0.5 ml-[26px] pl-3 border-l border-[var(--gray-200)] flex flex-col gap-0.5">
          {section.children.map((child) => {
            const href = resolveHref(child, lang);
            const active = isChildActive(pathname, href);
            return (
              <Link
                key={child.key}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                  active
                    ? "bg-[var(--gray-100)] text-black font-semibold"
                    : "text-[var(--gray-600)] hover:bg-[var(--gray-50)] hover:text-black"
                }`}
              >
                {child.label[lang]}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
