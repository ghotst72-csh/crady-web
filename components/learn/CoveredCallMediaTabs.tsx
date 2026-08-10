"use client";

import { useCallback, useRef, useState } from "react";

export type MediaTabId = "toon" | "video";

const TABS: { id: MediaTabId; label: string }[] = [
  { id: "toon", label: "Toon" },
  { id: "video", label: "Video" },
];

function panelId(tab: MediaTabId): string {
  return `covered-call-panel-${tab}`;
}

function tabId(tab: MediaTabId): string {
  return `covered-call-tab-${tab}`;
}

/** Toon/Video switcher for the covered-call landing page. Both panels are
 * always present in the server-rendered HTML (only a `hidden` class is
 * toggled) so the Toon image and the crawlable copy around it are never
 * gated behind client JS — same reasoning as EtfWorkspaceTabs. Toon is the
 * default per the page spec (visual explanation before the article text).
 * Implements the standard ARIA tabs keyboard pattern (Left/Right/Home/End)
 * since this is the page's one interactive element and must be fully
 * keyboard-operable. */
export function CoveredCallMediaTabs({
  toonPanel,
  videoPanel,
}: {
  toonPanel: React.ReactNode;
  videoPanel: React.ReactNode;
}) {
  const [active, setActive] = useState<MediaTabId>("toon");
  const tabRefs = useRef<Record<MediaTabId, HTMLButtonElement | null>>({ toon: null, video: null });

  const select = useCallback((tab: MediaTabId, focus = false) => {
    setActive(tab);
    if (focus) tabRefs.current[tab]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const idx = TABS.findIndex((t) => t.id === active);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = TABS[(idx + dir + TABS.length) % TABS.length];
        select(next.id, true);
      } else if (e.key === "Home") {
        e.preventDefault();
        select(TABS[0].id, true);
      } else if (e.key === "End") {
        e.preventDefault();
        select(TABS[TABS.length - 1].id, true);
      }
    },
    [active, select]
  );

  return (
    <div>
      <div role="tablist" aria-label="Covered call explainer format" className="flex gap-1 border-b border-[var(--gray-200)]">
        {TABS.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={selected}
              aria-controls={panelId(t.id)}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={onKeyDown}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                selected
                  ? "border-black text-black"
                  : "border-transparent text-[var(--gray-500)] hover:text-black"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={panelId("toon")} role="tabpanel" aria-labelledby={tabId("toon")} hidden={active !== "toon"} tabIndex={0}>
        {toonPanel}
      </div>
      <div id={panelId("video")} role="tabpanel" aria-labelledby={tabId("video")} hidden={active !== "video"} tabIndex={0}>
        {videoPanel}
      </div>
    </div>
  );
}
