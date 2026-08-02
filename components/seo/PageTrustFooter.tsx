import Link from "next/link";
import { EEAT_COPY } from "@/lib/eeat";

/** E-E-A-T trust block — Methodology / Data Sources / Update Frequency /
 * Disclaimer, rendered at the bottom of ticker pages, magazine articles,
 * hub/calendar-hub pages, and standalone guides. Condensed copy lives in
 * lib/eeat.ts (one source of truth); this links to /about#methodology for
 * the full explanation rather than repeating it at length on every page. */
export function PageTrustFooter({ lang = "en" }: { lang?: "en" | "ko" }) {
  const t = EEAT_COPY[lang];
  const aboutHref = lang === "ko" ? "/ko/about#methodology" : "/about#methodology";

  return (
    <div className="mt-10 pt-6 border-t border-[var(--gray-200)]">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {t.methodologyLabel}
          </div>
          <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{t.methodology}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {t.dataSourcesLabel}
          </div>
          <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{t.dataSources}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {t.updateFrequencyLabel}
          </div>
          <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{t.updateFrequency}</p>
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--gray-500)] uppercase tracking-wide">
            {t.disclaimerLabel}
          </div>
          <p className="mt-1 text-xs text-[var(--gray-600)] leading-relaxed">{t.disclaimer}</p>
        </div>
      </div>
      <Link href={aboutHref} className="mt-3 inline-block text-xs underline text-[var(--gray-500)] hover:text-black">
        {t.learnMoreLabel} →
      </Link>
    </div>
  );
}
