import { ARTICLE_TYPE_LABEL } from "./types";
import type { ArticleData } from "./data";
import type { ArticleTypeId } from "./types";
import { articleSlug } from "./recipes";
import { HUB_DEFINITIONS, type HubId } from "./hubs";
import type { CalendarHubId } from "./calendarHubs";
import type { StandalonePageId } from "./standalone";

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

export function buildInternalLinks(
  data: ArticleData,
  currentType: ArticleTypeId,
  extra?: { comparisonPeerTicker?: string | null }
): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];

  for (const type of ALL_TYPES) {
    if (type === currentType) continue;
    links.push({
      href: `/magazine/${articleSlug(data.ticker, type)}`,
      label: `${data.ticker} ${ARTICLE_TYPE_LABEL[type]}`,
    });
  }

  if (currentType !== "comparison" && extra?.comparisonPeerTicker) {
    links.push({
      href: `/magazine/${articleSlug(data.ticker, "comparison")}`,
      label: `${data.ticker} vs ${extra.comparisonPeerTicker}`,
    });
  }

  // Same-payout-frequency siblings surfaced first ("같은 지급일 ETF" —
  // same cadence, so their next-payment timing is directly comparable to
  // this ticker's) before other same-provider siblings. "같은 선언일 ETF" /
  // "같은 Risk ETF" / "같은 Sector ETF" from the Magazine 3.0 request aren't
  // built as their own dedicated hub URLs — declaration dates aren't
  // tracked reliably enough to group by, and per-dimension hubs risk
  // thin/near-empty pages at this ticker count; the risk/yield angle is
  // instead served by next-dividend-prediction's quick-compare teaser,
  // which already pulls real risk data for its peers.
  const sameFrequency = data.siblings.filter((s) => s.payout_frequency === data.payoutFrequency);
  const otherSiblings = data.siblings.filter((s) => s.payout_frequency !== data.payoutFrequency);
  for (const sibling of [...sameFrequency, ...otherSiblings].slice(0, 3)) {
    links.push({
      href: `/magazine/${articleSlug(sibling.ticker, "next-dividend-prediction")}`,
      label: `Compare with ${sibling.ticker}`,
    });
  }

  const hubCandidates: HubId[] = [];
  if (data.payoutFrequency === "weekly") hubCandidates.push("weekly-dividend-etfs");
  if (data.payoutFrequency === "monthly") hubCandidates.push("monthly-dividend-etfs");
  if (data.etf.provider_id === "yieldmax") hubCandidates.push("yieldmax-etfs");
  if (data.etf.provider_id === "roundhill") hubCandidates.push("roundhill-etfs");
  if (data.etf.provider_id === "defiance") hubCandidates.push("defiance-etfs");
  hubCandidates.push("highest-dividend-etfs", "best-covered-call-etfs", "etf-dividend-forecast");

  for (const hub of hubCandidates) {
    const def = HUB_DEFINITIONS[hub];
    links.push({ href: `/magazine/${hub}`, label: def.h1 });
  }

  const calendarHubCandidates: { slug: CalendarHubId; label: string }[] = [
    { slug: "dividend-calendar-this-week", label: "Dividend Calendar — This Week" },
    { slug: "dividend-calendar-this-month", label: "Dividend Calendar — This Month" },
  ];
  if (data.etf.provider_id === "yieldmax") {
    calendarHubCandidates.push({ slug: "yieldmax-dividend-calendar", label: "YieldMax Dividend Calendar" });
  }
  for (const hub of calendarHubCandidates) {
    links.push({ href: `/magazine/${hub.slug}`, label: hub.label });
  }

  const standalonePages: { slug: StandalonePageId; label: string }[] = [
    { slug: "tax-guide", label: "Covered Call ETF Dividend Tax Guide" },
    { slug: "how-to-buy", label: "How to Buy Dividend ETFs" },
  ];
  for (const page of standalonePages) {
    links.push({ href: `/magazine/${page.slug}`, label: page.label });
  }

  links.push({ href: `/${data.ticker.toLowerCase()}`, label: `${data.ticker} Full ETF Profile` });

  return links;
}
