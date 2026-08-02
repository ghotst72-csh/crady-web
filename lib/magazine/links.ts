import { ARTICLE_TYPE_LABEL } from "./types";
import type { ArticleData } from "./data";
import type { ArticleTypeId } from "./types";
import { articleSlug } from "./recipes";
import { HUB_DEFINITIONS, type HubId } from "./hubs";
import type { CalendarHubId } from "./calendarHubs";
import type { StandalonePageId } from "./standalone";
import { getRelevantGuidesForEtf, GUIDE_LABELS } from "./topicalLinks";

export type LinkItem = { href: string; label: string };

export type CategorizedLinks = {
  articles: LinkItem[];
  etfs: LinkItem[];
  rankings: LinkItem[];
  guides: LinkItem[];
  nextReading: LinkItem | null;
};

// dividend-calendar/dividend-history are safe to always link to (they exist
// for every ticker, only gated indexable-vs-noindex like risk-analysis, not
// gated present-vs-absent). "comparison" is deliberately excluded here — it
// only exists for tickers with a same-provider peer, and is linked
// separately below only when one was actually resolved for this page.
const ALL_TYPES: ArticleTypeId[] = [
  "next-dividend-prediction",
  "dividend-guide",
  "risk-analysis",
  "dividend-calendar",
  "dividend-history",
];

/** Internal Link Explosion (SEO Authority Phase 2) — the same underlying
 * link-generation logic as before, now grouped by category instead of
 * flattened, plus a new `guides` category driven by
 * getRelevantGuidesForEtf (the bidirectional pillar-guide linking added in
 * this phase) and a single `nextReading` pick. Rendered by
 * components/RelatedContent.tsx. */
export function buildInternalLinks(
  data: ArticleData,
  currentType: ArticleTypeId,
  extra?: { comparisonPeerTicker?: string | null }
): CategorizedLinks {
  const articles: LinkItem[] = [];
  const etfs: LinkItem[] = [];
  const rankings: LinkItem[] = [];
  const guides: LinkItem[] = [];

  for (const type of ALL_TYPES) {
    if (type === currentType) continue;
    articles.push({
      href: `/magazine/${articleSlug(data.ticker, type)}`,
      label: `${data.ticker} ${ARTICLE_TYPE_LABEL[type]}`,
    });
  }

  if (currentType !== "comparison" && extra?.comparisonPeerTicker) {
    articles.push({
      href: `/magazine/${articleSlug(data.ticker, "comparison")}`,
      label: `${data.ticker} vs ${extra.comparisonPeerTicker}`,
    });
  }

  // Same-payout-frequency siblings surfaced first ("같은 지급일 ETF" —
  // same cadence, so their next-payment timing is directly comparable to
  // this ticker's) before other same-provider siblings.
  const sameFrequency = data.siblings.filter((s) => s.payout_frequency === data.payoutFrequency);
  const otherSiblings = data.siblings.filter((s) => s.payout_frequency !== data.payoutFrequency);
  for (const sibling of [...sameFrequency, ...otherSiblings].slice(0, 3)) {
    etfs.push({
      href: `/magazine/${articleSlug(sibling.ticker, "next-dividend-prediction")}`,
      label: `Compare with ${sibling.ticker}`,
    });
  }
  etfs.push({ href: `/${data.ticker.toLowerCase()}`, label: `${data.ticker} Full ETF Profile` });

  const hubCandidates: HubId[] = [];
  if (data.payoutFrequency === "weekly") hubCandidates.push("weekly-dividend-etfs");
  if (data.payoutFrequency === "monthly") hubCandidates.push("monthly-dividend-etfs");
  if (data.etf.provider_id === "yieldmax") hubCandidates.push("yieldmax-etfs");
  if (data.etf.provider_id === "roundhill") hubCandidates.push("roundhill-etfs");
  if (data.etf.provider_id === "defiance") hubCandidates.push("defiance-etfs");
  hubCandidates.push("highest-dividend-etfs", "best-covered-call-etfs", "etf-dividend-forecast");

  for (const hub of hubCandidates) {
    const def = HUB_DEFINITIONS[hub];
    rankings.push({ href: `/magazine/${hub}`, label: def.h1 });
  }

  const calendarHubCandidates: { slug: CalendarHubId; label: string }[] = [
    { slug: "dividend-calendar-this-week", label: "Dividend Calendar — This Week" },
    { slug: "dividend-calendar-this-month", label: "Dividend Calendar — This Month" },
  ];
  if (data.etf.provider_id === "yieldmax") {
    calendarHubCandidates.push({ slug: "yieldmax-dividend-calendar", label: "YieldMax Dividend Calendar" });
  }
  for (const hub of calendarHubCandidates) {
    rankings.push({ href: `/magazine/${hub.slug}`, label: hub.label });
  }
  rankings.push({ href: "/distributions", label: "Latest Official Distributions" });

  const standalonePages: { slug: StandalonePageId; label: string }[] = [
    { slug: "tax-guide", label: "Covered Call ETF Dividend Tax Guide" },
    { slug: "how-to-buy", label: "How to Buy Dividend ETFs" },
    ...getRelevantGuidesForEtf(data.etf, data.payoutFrequency).map((slug) => ({
      slug,
      label: GUIDE_LABELS[slug],
    })),
  ];
  for (const page of standalonePages) {
    guides.push({ href: `/magazine/${page.slug}`, label: page.label });
  }

  // A single "keep reading" suggestion — the flagship prediction article if
  // we're not already on it, otherwise the dividend guide.
  const nextReading: LinkItem | null =
    currentType === "next-dividend-prediction"
      ? { href: `/magazine/${articleSlug(data.ticker, "dividend-guide")}`, label: `${data.ticker} Dividend Guide` }
      : { href: `/magazine/${articleSlug(data.ticker, "next-dividend-prediction")}`, label: `${data.ticker} Next Dividend Prediction` };

  return { articles, etfs, rankings, guides, nextReading };
}
