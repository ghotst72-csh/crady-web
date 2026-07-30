import { ARTICLE_TYPE_SLUG } from "./recipes";
import type { ArticleTypeId } from "./types";
import { isHubSlug, type HubId } from "./hubs";
import { isCalendarHubSlug, type CalendarHubId } from "./calendarHubs";
import { isStandalonePageSlug, type StandalonePageId } from "./standalone";

export type ResolvedSlug =
  | { kind: "hub"; hub: HubId }
  | { kind: "calendar-hub"; hub: CalendarHubId }
  | { kind: "standalone"; page: StandalonePageId }
  | { kind: "article"; ticker: string; type: ArticleTypeId }
  | null;

// Longest slug first — "next-dividend-prediction" must be tried before any
// shorter suffix that could also match its tail, so suffix-matching stays
// unambiguous as more article-type slugs are added.
const TYPE_BY_SUFFIX: [string, ArticleTypeId][] = (
  Object.entries(ARTICLE_TYPE_SLUG) as [ArticleTypeId, string][]
)
  .map(([type, slug]): [string, ArticleTypeId] => [slug, type])
  .sort((a, b) => b[0].length - a[0].length);

/** Parses a /magazine/{slug} URL into a fixed hub page, a calendar hub, a
 * standalone educational page, or a {ticker}-{article-type} pair. Ticker
 * *existence* isn't checked here — that happens when the caller fetches
 * article data and gets null. */
export function resolveSlug(slug: string): ResolvedSlug {
  if (isHubSlug(slug)) return { kind: "hub", hub: slug };
  if (isCalendarHubSlug(slug)) return { kind: "calendar-hub", hub: slug };
  if (isStandalonePageSlug(slug)) return { kind: "standalone", page: slug };

  for (const [suffix, type] of TYPE_BY_SUFFIX) {
    const marker = `-${suffix}`;
    if (slug.length > marker.length && slug.endsWith(marker)) {
      const ticker = slug.slice(0, -marker.length);
      if (ticker) return { kind: "article", ticker, type };
    }
  }
  return null;
}
