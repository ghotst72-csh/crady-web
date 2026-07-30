import { ARTICLE_TYPE_SLUG } from "./recipes";
import type { ArticleTypeId } from "./types";
import { isHubSlug, type HubId } from "./hubs";

export type ResolvedSlug =
  | { kind: "hub"; hub: HubId }
  | { kind: "article"; ticker: string; type: ArticleTypeId }
  | null;

const TYPE_BY_SUFFIX: [string, ArticleTypeId][] = (
  Object.entries(ARTICLE_TYPE_SLUG) as [ArticleTypeId, string][]
).map(([type, slug]) => [slug, type]);

/** Parses a /magazine/{slug} URL into either a fixed hub page or a
 * {ticker}-{article-type} pair. Ticker *existence* isn't checked here —
 * that happens when the caller fetches article data and gets null. */
export function resolveSlug(slug: string): ResolvedSlug {
  if (isHubSlug(slug)) return { kind: "hub", hub: slug };

  for (const [suffix, type] of TYPE_BY_SUFFIX) {
    const marker = `-${suffix}`;
    if (slug.length > marker.length && slug.endsWith(marker)) {
      const ticker = slug.slice(0, -marker.length);
      if (ticker) return { kind: "article", ticker, type };
    }
  }
  return null;
}
