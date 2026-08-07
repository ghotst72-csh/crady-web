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
import { getAllAnnouncements } from "@/lib/distributions/data";
import type { ArticleTypeId } from "@/lib/magazine/types";

export const dynamic = "force-static";

const ARTICLE_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];
const UNCONDITIONAL_ARTICLE_TYPES = ARTICLE_TYPES.filter((t) => t !== "comparison");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [snapshot, allTickers, tickersWithSchedule, tickersWithDistOrStrategy, announcements] = await Promise.all([
    getHomeSnapshot(),
    getAllTickers(),
    getTickersWithFutureSchedule(),
    getTickersWithDistributionOrStrategyContent(),
    getAllAnnouncements(),
  ]);

  // Most recent pipeline run across all tickers — a real, verifiable
  // "when was this site's data last refreshed" signal for the aggregate
  // pages (home/ranking/calendar), instead of an arbitrary build timestamp.
  const mostRecentCalculatedAt = snapshot.reduce<Date | null>((latest, r) => {
    if (!r.calculatedAt) return latest;
    const d = new Date(r.calculatedAt);
    return !latest || d > latest ? d : latest;
  }, null);

  // Every EN/KO pair below carries reciprocal `alternates.languages` (the
  // Next.js sitemap API's hreflang mechanism) — each entry declares both
  // its own URL and its counterpart's, plus x-default pointing at the
  // English (root) version per the international SEO spec. Magazine has no
  // Korean tree (see the report), so its entries carry no language
  // alternates at all — that's correct, not an omission.
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: "https://crady.net",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: {
          en: "https://crady.net",
          ko: "https://crady.net/ko",
          "x-default": "https://crady.net",
        },
      },
    },
    {
      url: "https://crady.net/ko",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: {
          en: "https://crady.net",
          ko: "https://crady.net/ko",
          "x-default": "https://crady.net",
        },
      },
    },
    {
      url: "https://crady.net/ranking",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: {
          en: "https://crady.net/ranking",
          ko: "https://crady.net/ko/ranking",
          "x-default": "https://crady.net/ranking",
        },
      },
    },
    {
      url: "https://crady.net/ko/ranking",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: {
          en: "https://crady.net/ranking",
          ko: "https://crady.net/ko/ranking",
          "x-default": "https://crady.net/ranking",
        },
      },
    },
    {
      url: "https://crady.net/portfolio",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: "https://crady.net/portfolio",
          ko: "https://crady.net/ko/portfolio",
          "x-default": "https://crady.net/portfolio",
        },
      },
    },
    {
      url: "https://crady.net/ko/portfolio",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: {
          en: "https://crady.net/portfolio",
          ko: "https://crady.net/ko/portfolio",
          "x-default": "https://crady.net/portfolio",
        },
      },
    },
    {
      url: "https://crady.net/calendar",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: {
          en: "https://crady.net/calendar",
          ko: "https://crady.net/ko/calendar",
          "x-default": "https://crady.net/calendar",
        },
      },
    },
    {
      url: "https://crady.net/ko/calendar",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
      alternates: {
        languages: {
          en: "https://crady.net/calendar",
          ko: "https://crady.net/ko/calendar",
          "x-default": "https://crady.net/calendar",
        },
      },
    },
    {
      url: "https://crady.net/distributions",
      lastModified: announcements[0] ? new Date(announcements[0].fetched_at) : undefined,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          en: "https://crady.net/distributions",
          ko: "https://crady.net/ko/distributions",
          "x-default": "https://crady.net/distributions",
        },
      },
    },
    {
      url: "https://crady.net/ko/distributions",
      lastModified: announcements[0] ? new Date(announcements[0].fetched_at) : undefined,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          en: "https://crady.net/distributions",
          ko: "https://crady.net/ko/distributions",
          "x-default": "https://crady.net/distributions",
        },
      },
    },
    {
      url: "https://crady.net/distributions/archive",
      lastModified: announcements[0] ? new Date(announcements[0].fetched_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.5,
      alternates: {
        languages: {
          en: "https://crady.net/distributions/archive",
          ko: "https://crady.net/ko/distributions/archive",
          "x-default": "https://crady.net/distributions/archive",
        },
      },
    },
    {
      url: "https://crady.net/ko/distributions/archive",
      lastModified: announcements[0] ? new Date(announcements[0].fetched_at) : undefined,
      changeFrequency: "weekly",
      priority: 0.5,
      alternates: {
        languages: {
          en: "https://crady.net/distributions/archive",
          ko: "https://crady.net/ko/distributions/archive",
          "x-default": "https://crady.net/distributions/archive",
        },
      },
    },
    {
      url: "https://crady.net/magazine",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://crady.net/next-dividend",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          en: "https://crady.net/next-dividend",
          ko: "https://crady.net/ko/next-dividend",
          "x-default": "https://crady.net/next-dividend",
        },
      },
    },
    {
      url: "https://crady.net/ko/next-dividend",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          en: "https://crady.net/next-dividend",
          ko: "https://crady.net/ko/next-dividend",
          "x-default": "https://crady.net/next-dividend",
        },
      },
    },
    {
      url: "https://crady.net/prediction-accuracy",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.7,
      alternates: {
        languages: {
          en: "https://crady.net/prediction-accuracy",
          ko: "https://crady.net/ko/prediction-accuracy",
          "x-default": "https://crady.net/prediction-accuracy",
        },
      },
    },
    {
      url: "https://crady.net/ko/prediction-accuracy",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.7,
      alternates: {
        languages: {
          en: "https://crady.net/prediction-accuracy",
          ko: "https://crady.net/ko/prediction-accuracy",
          "x-default": "https://crady.net/prediction-accuracy",
        },
      },
    },
    {
      url: "https://crady.net/weekly-intelligence",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.6,
      alternates: {
        languages: {
          en: "https://crady.net/weekly-intelligence",
          ko: "https://crady.net/ko/weekly-intelligence",
          "x-default": "https://crady.net/weekly-intelligence",
        },
      },
    },
    {
      url: "https://crady.net/ko/weekly-intelligence",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.6,
      alternates: {
        languages: {
          en: "https://crady.net/weekly-intelligence",
          ko: "https://crady.net/ko/weekly-intelligence",
          "x-default": "https://crady.net/weekly-intelligence",
        },
      },
    },
    {
      url: "https://crady.net/monthly-intelligence",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.6,
      alternates: {
        languages: {
          en: "https://crady.net/monthly-intelligence",
          ko: "https://crady.net/ko/monthly-intelligence",
          "x-default": "https://crady.net/monthly-intelligence",
        },
      },
    },
    {
      url: "https://crady.net/ko/monthly-intelligence",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "daily",
      priority: 0.6,
      alternates: {
        languages: {
          en: "https://crady.net/monthly-intelligence",
          ko: "https://crady.net/ko/monthly-intelligence",
          "x-default": "https://crady.net/monthly-intelligence",
        },
      },
    },
    {
      // English-only, like /magazine above — no Korean tree exists for it.
      url: "https://crady.net/data-terms",
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: "https://crady.net/about",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          en: "https://crady.net/about",
          ko: "https://crady.net/ko/about",
          "x-default": "https://crady.net/about",
        },
      },
    },
    {
      url: "https://crady.net/ko/about",
      lastModified: mostRecentCalculatedAt ?? undefined,
      changeFrequency: "monthly",
      priority: 0.3,
      alternates: {
        languages: {
          en: "https://crady.net/about",
          ko: "https://crady.net/ko/about",
          "x-default": "https://crady.net/about",
        },
      },
    },
  ];

  const tickerEntries: MetadataRoute.Sitemap = snapshot.flatMap((etf) => {
    const enUrl = `https://crady.net/${etf.ticker.toLowerCase()}`;
    const koUrl = `https://crady.net/ko/${etf.ticker.toLowerCase()}`;
    const languages = { en: enUrl, ko: koUrl, "x-default": enUrl };
    return [
      {
        url: enUrl,
        lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.9,
        alternates: { languages },
      },
      {
        url: koUrl,
        lastModified: etf.calculatedAt ? new Date(etf.calculatedAt) : undefined,
        changeFrequency: "daily" as const,
        priority: 0.9,
        alternates: { languages },
      },
    ];
  });

  const announcementEntries: MetadataRoute.Sitemap = announcements.flatMap((a) => {
    const enUrl = `https://crady.net/distributions/${a.slug}`;
    const koUrl = `https://crady.net/ko/distributions/${a.slug}`;
    const languages = { en: enUrl, ko: koUrl, "x-default": enUrl };
    return [
      {
        url: enUrl,
        lastModified: new Date(a.fetched_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      },
      {
        url: koUrl,
        lastModified: new Date(a.fetched_at),
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      },
    ];
  });

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
    lastModified: mostRecentCalculatedAt ?? undefined,
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
    ...announcementEntries,
    ...hubEntries,
    ...calendarHubEntries,
    ...standaloneEntries,
    ...magazineEntries,
    ...comparisonEntries,
  ];
}
