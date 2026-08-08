"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ETF_WORKSPACE_TABS,
  DEFAULT_ETF_WORKSPACE_TAB,
  isEtfWorkspaceTabId,
  type EtfWorkspaceTabId,
} from "@/lib/etf/workspaceTabs";

const T = { label: { en: "ETF sections", ko: "ETF 섹션" } } as const;

function panelId(tab: EtfWorkspaceTabId): string {
  return `etf-tab-${tab}`;
}

/** CRADY Phase 3 — the persistent, local ETF-workspace tab bar (spec §1/
 * §2), distinct from the global CRADY sidebar. All five tab panels are
 * always present in the server-rendered HTML (see page.tsx) — this
 * component only toggles a `hidden` class on the panel elements by id, via
 * plain DOM APIs rather than React state owning the (large, real-data-
 * heavy) content subtrees. That keeps every tab's content fully crawlable
 * regardless of JS, gives instant tab switching with zero re-fetch, and
 * needs no server-side searchParams read (the ticker page stays fully
 * statically generated under ISR, unaffected by this feature).
 *
 * Deep linking: `?tab=<id>` is read on mount and kept in sync via
 * history.pushState/popstate — deliberately not Next.js's router, so
 * switching tabs never triggers a server round-trip on an otherwise
 * static page. `data-etf-tab-link="<id>"` on any server-rendered element
 * anywhere on the page (e.g. Summary's "View Full History →") switches
 * the tab via delegated click handling, without that element needing to
 * be a client component itself. */
export function EtfWorkspaceTabs({
  lang = "en",
  communityCount = null,
}: {
  lang?: "en" | "ko";
  /** Real discussion count for this ticker (spec: the "327" badge next
   * to Community in the tab bar) — omitted entirely when there's no real
   * activity yet, never a placeholder zero. */
  communityCount?: number | null;
}) {
  const [active, setActive] = useState<EtfWorkspaceTabId>(DEFAULT_ETF_WORKSPACE_TAB);

  const applyTab = useCallback((tab: EtfWorkspaceTabId) => {
    for (const t of ETF_WORKSPACE_TABS) {
      document.getElementById(panelId(t.id))?.classList.toggle("hidden", t.id !== tab);
    }
    setActive(tab);
  }, []);

  const selectTab = useCallback(
    (tab: EtfWorkspaceTabId, opts: { pushHistory?: boolean; scroll?: boolean } = {}) => {
      const { pushHistory = true, scroll = true } = opts;
      applyTab(tab);
      if (pushHistory) {
        const url = new URL(window.location.href);
        if (tab === DEFAULT_ETF_WORKSPACE_TAB) url.searchParams.delete("tab");
        else url.searchParams.set("tab", tab);
        window.history.pushState({ etfTab: tab }, "", url);
      }
      if (scroll) {
        document.getElementById("etf-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [applyTab]
  );

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("tab");
    if (isEtfWorkspaceTabId(initial) && initial !== DEFAULT_ETF_WORKSPACE_TAB) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reading the deep-link ?tab= param requires window.location, unavailable during SSR/render; this runs once on mount, not on every re-render.
      applyTab(initial);
    }

    function onPopState() {
      const tab = new URLSearchParams(window.location.search).get("tab");
      applyTab(isEtfWorkspaceTabId(tab) ? tab : DEFAULT_ETF_WORKSPACE_TAB);
    }
    window.addEventListener("popstate", onPopState);

    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement | null)?.closest("[data-etf-tab-link]");
      if (!target) return;
      const tab = target.getAttribute("data-etf-tab-link");
      if (isEtfWorkspaceTabId(tab)) {
        e.preventDefault();
        selectTab(tab);
      }
    }
    document.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick);
    };
  }, [applyTab, selectTab]);

  return (
    <nav
      aria-label={T.label[lang]}
      className="border-b border-[var(--gray-200)]"
    >
      <div className="mx-auto max-w-[1400px] flex gap-6 overflow-x-auto px-6">
        {ETF_WORKSPACE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            aria-current={active === t.id ? "page" : undefined}
            className={`shrink-0 inline-flex items-center gap-1.5 py-3 text-[15px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === t.id
                ? "border-indigo-600 text-black font-semibold"
                : "border-transparent text-[var(--gray-500)] hover:text-black"
            }`}
          >
            {t.label[lang]}
            {t.id === "community" && communityCount != null && communityCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                {communityCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
