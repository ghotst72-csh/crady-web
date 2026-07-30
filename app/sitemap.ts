import type { MetadataRoute } from "next";
import {
  getHomeSnapshot,
  getAllTickers,
  getTickersWithFutureSchedule,
  getTickersWithDistributionOrStrategyContent,
} from "@/lib/data";
import { ARTICLE_TYPE_SLUG } from "@/lib/magazine/recipes";
import { HUB_IDS } from "@/lib/magazine/hubs";
import { CALENDAR_HUB_IDS } from "@/lib/magazine/calendarHubs";
import { STANDALONE_PAGE_IDS } from "@/lib/magazine/standalone";
import { hasRiskContentFromSnapshot } from "@/lib/magazine/quality";
import { pickComparisonPeerTicker } from "@/lib/magazine/comparison";
import type { ArticleTypeId } from "@/lib/magazine/types";

export const dynamic = "force-static";

const ARTICLE_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];
const UNCONDITIONAL_ARTICLE_TYPES = ARTICLE_TYPES.filter((t) => t !== "comparison");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [snapshot, allTickers, tickersWithSchedule, tickersWithDistOrStrategy] = await Promise.all([
    getHomeSnapshot(),
    getAllTickers(),
    getTickersWithFutureSchedule(),
    getTickersWithDistributionOrStrategyContent(),
  ]);

  // Most recent pipeline run across all tickers — a real, verifiable
  // "when was this site's data last refreshed" signal for the aggregate
  // pages (home/ranking/calendar), instead of an arbitrary build timestamp.
  const mostRecentCalculatedAt = snapshot.reduce<Date | null>((latest, r) => {
    if (!r.calculatedAt) return latest;
    const d = new Date(r.calculatedAt);
    return !latest || d > latest ? d : latest;
  }, null);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://crady.net",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://crady.net/ranking",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://crady.net/calendar",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://crady.net/magazine",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    { url: "https://crady.net/about", changeFrequency: "monthly", priority: 0.3 },
  ];

  const tickerEntries: MetadataRoute.Sitemap = snapshot.map((etf) => ({
    url: `https://crady.net/${etf.ticker.toLowerCase()}`,
    lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  const hubEntries: MetadataRoute.Sitemap = HUB_IDS.map((slug) => ({
    url: `https://crady.net/magazine/${slug}`,
    lastModified: mostRecentCalculatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const calendarHubEntries: MetadataRoute.Sitemap = CALENDAR_HUB_IDS.map((slug) => ({
    url: `https://crady.net/magazine/${slug}`,
    lastModified: mostRecentCalculatedAt ?? undefined,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  const standaloneEntries: MetadataRoute.Sitemap = STANDALONE_PAGE_IDS.map((slug) => ({
    url: `https://crady.net/magazine/${slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // A risk-analysis page for a ticker with zero risk data, a
  // dividend-calendar page with no published future schedule, or a
  // dividend-guide/dividend-history page for a ticker with no paid
  // distributions and no strategy copy, renders as pure FAQ boilerplate
  // (see lib/magazine/quality.ts + scripts/audit-magazine-uniqueness.mjs)
  // — excluded here to match the noindex directive generateMetadata sets
  // on that same page, instead of submitting a URL to Google that says
  // "don't index me."
  const magazineEntries: MetadataRoute.Sitemap = snapshot.flatMap((etf) =>
    UNCONDITIONAL_ARTICLE_TYPES.filter(
      (type) =>
        (type !== "risk-analysis" || hasRiskContentFromSnapshot(etf)) &&
        (type !== "dividend-calendar" || tickersWithSchedule.has(etf.ticker)) &&
        ((type !== "dividend-guide" && type !== "dividend-history") ||
          tickersWithDistOrStrategy.has(etf.ticker))
    ).map((type) => ({
      url: `https://crady.net/magazine/${etf.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG[type]}`,
      lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
      changeFrequency: "daily" as const,
      priority: type === "next-dividend-prediction" ? 0.85 : 0.7,
    }))
  );

  // comparison pages only exist for tickers with a same-provider peer
  // (lib/magazine/comparison.ts) — every other ticker simply has no
  // comparison URL, rather than a generated-then-noindexed one.
  const comparisonEntries: MetadataRoute.Sitemap = allTickers
    .filter((t) => pickComparisonPeerTicker(t.ticker, t.provider_id, allTickers) != null)
    .map((t) => ({
      url: `https://crady.net/magazine/${t.ticker.toLowerCase()}-${ARTICLE_TYPE_SLUG.comparison}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [
    ...staticEntries,
    ...tickerEntries,
    ...hubEntries,
    ...calendarHubEntries,
    ...standaloneEntries,
    ...magazineEntries,
    ...comparisonEntries,
  ];
}
