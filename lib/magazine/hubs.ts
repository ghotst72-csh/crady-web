import type { EtfSnapshot } from "@/lib/data";

export type HubId =
  | "weekly-dividend-etfs"
  | "monthly-dividend-etfs"
  | "yieldmax-etfs"
  | "roundhill-etfs"
  | "defiance-etfs"
  | "highest-dividend-etfs"
  | "etf-dividend-forecast"
  | "best-covered-call-etfs"
  | "upcoming-dividend-etfs";

export type HubDefinition = {
  slug: HubId;
  title: string;
  h1: string;
  description: string;
  filter: (e: EtfSnapshot) => boolean;
  sort: (a: EtfSnapshot, b: EtfSnapshot) => number;
};

const byYieldDesc = (a: EtfSnapshot, b: EtfSnapshot) =>
  (b.annualYieldPct ?? -1) - (a.annualYieldPct ?? -1);

export const HUB_DEFINITIONS: Record<HubId, HubDefinition> = {
  "weekly-dividend-etfs": {
    slug: "weekly-dividend-etfs",
    title: "Weekly Dividend ETFs (2026) | Highest-Paying Weekly Income Funds",
    h1: "Weekly Dividend ETFs",
    description:
      "A data-driven list of ETFs that pay distributions weekly, ranked by estimated annualized dividend yield, with CRADY scores and risk levels.",
    filter: (e) => e.payoutFrequency === "weekly",
    sort: byYieldDesc,
  },
  "monthly-dividend-etfs": {
    slug: "monthly-dividend-etfs",
    title: "Monthly Dividend ETFs (2026) | Monthly Income Funds Ranked",
    h1: "Monthly Dividend ETFs",
    description:
      "ETFs that pay distributions monthly, ranked by estimated annualized dividend yield, with CRADY scores and risk levels.",
    filter: (e) => e.payoutFrequency === "monthly",
    sort: byYieldDesc,
  },
  "yieldmax-etfs": {
    slug: "yieldmax-etfs",
    title: "YieldMax ETFs (2026) | Full List Ranked by Dividend Yield",
    h1: "YieldMax ETFs",
    description:
      "Every YieldMax covered-call ETF tracked by CRADY, ranked by estimated annualized dividend yield with CRADY scores and risk levels.",
    filter: (e) => e.provider_id === "yieldmax",
    sort: byYieldDesc,
  },
  "roundhill-etfs": {
    slug: "roundhill-etfs",
    title: "Roundhill ETFs (2026) | Full List Ranked by Dividend Yield",
    h1: "Roundhill ETFs",
    description:
      "Every Roundhill covered-call ETF tracked by CRADY, ranked by estimated annualized dividend yield with CRADY scores and risk levels.",
    filter: (e) => e.provider_id === "roundhill",
    sort: byYieldDesc,
  },
  "defiance-etfs": {
    slug: "defiance-etfs",
    title: "Defiance ETFs (2026) | Full List Ranked by Dividend Yield",
    h1: "Defiance ETFs",
    description:
      "Every Defiance covered-call ETF tracked by CRADY, ranked by estimated annualized dividend yield with CRADY scores and risk levels.",
    filter: (e) => e.provider_id === "defiance",
    sort: byYieldDesc,
  },
  "highest-dividend-etfs": {
    slug: "highest-dividend-etfs",
    title: "Highest Dividend ETFs (2026) | Top Yields Ranked by CRADY",
    h1: "Highest Dividend ETFs",
    description:
      "The highest-yielding dividend ETFs tracked by CRADY, ranked by estimated annualized distribution yield.",
    filter: (e) => e.annualYieldPct != null,
    sort: byYieldDesc,
  },
  "etf-dividend-forecast": {
    slug: "etf-dividend-forecast",
    title: "ETF Dividend Forecast (2026) | Highest-Confidence Predictions",
    h1: "ETF Dividend Forecast",
    description:
      "ETFs with CRADY's highest-confidence next-dividend predictions, ranked by prediction confidence score rather than yield — the funds whose next payment date and amount are most reliably forecastable right now.",
    filter: (e) => e.nextPredictedConfidence != null,
    sort: (a, b) => (b.nextPredictedConfidence ?? -1) - (a.nextPredictedConfidence ?? -1),
  },
  "best-covered-call-etfs": {
    slug: "best-covered-call-etfs",
    title: "Best Covered Call ETFs (2026) | Ranked by CRADY Score",
    h1: "Best Covered Call ETFs",
    description:
      "Covered-call and options-income ETFs ranked by CRADY score — a safety-adjusted quality measure that weighs volatility and dividend stability alongside yield, not raw yield alone.",
    filter: (e) => e.cradyScore != null,
    sort: (a, b) => (b.cradyScore ?? -1) - (a.cradyScore ?? -1),
  },
  "upcoming-dividend-etfs": {
    slug: "upcoming-dividend-etfs",
    title: "Upcoming Dividend ETFs | Sorted by Next Payment Date",
    h1: "Upcoming Dividend ETFs",
    description:
      "ETFs with a registered next-dividend prediction, sorted by the soonest upcoming payment date — which funds are paying next, not which pay the most.",
    filter: (e) => e.nextPredictedDate != null,
    sort: (a, b) => (a.nextPredictedDate! < b.nextPredictedDate! ? -1 : 1),
  },
};

export const HUB_IDS = Object.keys(HUB_DEFINITIONS) as HubId[];

export function isHubSlug(slug: string): slug is HubId {
  return slug in HUB_DEFINITIONS;
}
