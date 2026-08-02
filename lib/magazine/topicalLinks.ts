import type { EtfRow } from "@/lib/data";
import type { StandalonePageId } from "./standalone";

const UNIVERSAL_GUIDES: StandalonePageId[] = [
  "covered-call-etf-guide",
  "distribution-schedule-guide",
  "ex-dividend-date-guide",
  "payment-date-guide",
  "distribution-rate-guide",
  "sec-yield-guide",
  "nav-erosion-guide",
  "return-of-capital-guide",
];

/** The bidirectional-linking brain for the 10 topical pillar guides
 * (lib/magazine/standalone.tsx) — every ETF page links out to the subset of
 * guides genuinely relevant to it, and each guide's own page links back to
 * real, current matching ETFs via its `relatedEtfsQuery`. Rule-based, not
 * hardcoded per ticker: every ETF gets the 8 universal guides (they apply
 * to every covered-call income ETF CRADY tracks), plus conditionally
 * `monthly-vs-weekly-dividend-etfs` (only once payout frequency is actually
 * known) and `yieldmax-guide` (only for YieldMax-issued funds). */
export function getRelevantGuidesForEtf(
  etf: Pick<EtfRow, "provider_id">,
  payoutFrequency: string | null
): StandalonePageId[] {
  const guides = [...UNIVERSAL_GUIDES];
  if (payoutFrequency === "weekly" || payoutFrequency === "monthly") {
    guides.push("monthly-vs-weekly-dividend-etfs");
  }
  if (etf.provider_id === "yieldmax") {
    guides.push("yieldmax-guide");
  }
  return guides;
}

/** Human-readable labels for the guide chips — kept here (not re-derived
 * from STANDALONE_PAGES.h1) so callers that only need a short label don't
 * have to import the full page-definition object with its ReactNode
 * bodies. */
export const GUIDE_LABELS: Record<StandalonePageId, string> = {
  "tax-guide": "Dividend Tax Guide",
  "how-to-buy": "How to Buy Dividend ETFs",
  "covered-call-etf-guide": "What Is a Covered Call ETF?",
  "monthly-vs-weekly-dividend-etfs": "Monthly vs Weekly Dividend ETFs",
  "yieldmax-guide": "YieldMax ETF Guide",
  "distribution-schedule-guide": "Distribution Schedule Guide",
  "ex-dividend-date-guide": "Ex-Dividend Date Guide",
  "payment-date-guide": "Payment Date Guide",
  "distribution-rate-guide": "Distribution Rate Guide",
  "sec-yield-guide": "SEC Yield Guide",
  "nav-erosion-guide": "NAV Erosion Guide",
  "return-of-capital-guide": "Return of Capital Guide",
};
