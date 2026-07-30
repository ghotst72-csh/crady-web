import { ARTICLE_TYPE_LABEL } from "./types";
import type { ArticleData } from "./data";
import type { ArticleTypeId } from "./types";
import { articleSlug } from "./recipes";
import { HUB_DEFINITIONS, type HubId } from "./hubs";

const ALL_TYPES: ArticleTypeId[] = ["next-dividend-prediction", "dividend-guide", "risk-analysis"];

export function buildInternalLinks(
  data: ArticleData,
  currentType: ArticleTypeId
): { href: string; label: string }[] {
  const links: { href: string; label: string }[] = [];

  for (const type of ALL_TYPES) {
    if (type === currentType) continue;
    links.push({
      href: `/magazine/${articleSlug(data.ticker, type)}`,
      label: `${data.ticker} ${ARTICLE_TYPE_LABEL[type]}`,
    });
  }

  for (const sibling of data.siblings.slice(0, 3)) {
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
  hubCandidates.push("highest-dividend-etfs");

  for (const hub of hubCandidates) {
    const def = HUB_DEFINITIONS[hub];
    links.push({ href: `/magazine/${hub}`, label: def.h1 });
  }

  links.push({ href: `/${data.ticker.toLowerCase()}`, label: `${data.ticker} Full ETF Profile` });

  return links;
}
