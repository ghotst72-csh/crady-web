import type { AutomatedActivityItem } from "./types";

export type FeaturedTopic = {
  title: string;
  href: string;
  /** Which tier of the fallback chain produced this — lets the caller show
   * a badge distinguishing "investors are discussing this" from "this is
   * CRADY's own most recent analysis," so the two are never confused. */
  kind: "investor-discussion" | "official" | "crady-analysis";
  replyCount?: number;
};

/** Most Discussed's fallback chain (product requirement: never show an
 * empty box while there's ANY real content to point to). Order:
 * 1. A real investor topic that actually has replies (the strongest signal
 *    — people are actually talking).
 * 2. The most recent real Official item (a real announcement, not
 *    fabricated engagement).
 * 3. The most recent real CRADY Analysis item.
 * 4. null — the honest empty state, only once every real tier is exhausted. */
export function pickMostDiscussedFallback(
  mostDiscussed: { title: string; replyCount: number } | null,
  automatedItems: AutomatedActivityItem[]
): FeaturedTopic | null {
  if (mostDiscussed) {
    return {
      title: mostDiscussed.title,
      href: "#investor-discussion",
      kind: "investor-discussion",
      replyCount: mostDiscussed.replyCount,
    };
  }

  const official = automatedItems.find((i) => i.source === "official");
  if (official) {
    return { title: official.title, href: official.sourceUrl ?? "#etf-activity", kind: "official" };
  }

  const crady = automatedItems.find((i) => i.source === "crady" || i.source === "ai");
  if (crady) {
    return { title: crady.title, href: crady.sourceUrl ?? "#etf-activity", kind: "crady-analysis" };
  }

  return null;
}

/** Trending Topics' fallback: real trending investor topics first (already
 * time-decayed/engagement-ranked by getTrendingTopics), padded out with
 * the most recent automated items only when there aren't enough investor
 * topics to fill the list — never mixing the two in a way that makes an
 * automated item look like investor engagement (the `kind` tag on each
 * result is what the UI uses to keep that distinction visible). */
export function pickTrendingFallback(
  trendingInvestorTopics: { id: string; title: string; replyCount: number }[],
  automatedItems: AutomatedActivityItem[],
  limit = 3
): FeaturedTopic[] {
  const investor: FeaturedTopic[] = trendingInvestorTopics.map((t) => ({
    title: t.title,
    href: `#activity-item-${t.id}`,
    kind: "investor-discussion",
    replyCount: t.replyCount,
  }));
  if (investor.length >= limit) return investor.slice(0, limit);

  const filler: FeaturedTopic[] = automatedItems.slice(0, limit - investor.length).map((i) => ({
    title: i.title,
    href: i.sourceUrl ?? "#etf-activity",
    kind: i.source === "official" ? "official" : "crady-analysis",
  }));

  return [...investor, ...filler];
}
