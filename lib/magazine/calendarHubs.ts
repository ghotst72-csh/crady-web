import {
  getThisWeekDividends,
  getThisMonthDividends,
  getUpcomingDividendsByProvider,
  type WeeklyDividend,
} from "@/lib/data";

/** Calendar-style hub pages: a list of upcoming payment EVENTS (potentially
 * several per ticker), not a ranked one-row-per-ticker list like
 * HUB_DEFINITIONS. Kept as a separate, smaller definition set rather than
 * forced into HubDefinition's filter/sort-over-EtfSnapshot shape, since the
 * underlying data shape is genuinely different. Each of these is legitimate
 * (non-doorway) dynamic content: the page's own URL stays constant while its
 * member list changes automatically as dates roll off — the correct pattern
 * for "this week" / "this month" queries, instead of minting a new URL per
 * week or month (see CRADY SEO Magazine 2.0 scope notes). */
export type CalendarHubId =
  | "dividend-calendar-this-week"
  | "dividend-calendar-this-month"
  | "yieldmax-dividend-calendar";

export type CalendarHubDefinition = {
  slug: CalendarHubId;
  title: string;
  h1: string;
  description: string;
  fetcher: () => Promise<WeeklyDividend[]>;
};

export const CALENDAR_HUB_DEFINITIONS: Record<CalendarHubId, CalendarHubDefinition> = {
  "dividend-calendar-this-week": {
    slug: "dividend-calendar-this-week",
    title: "Dividend Calendar This Week | Ex-Dividend & Payment Dates",
    h1: "Dividend Calendar — This Week",
    description:
      "Every ETF with an ex-dividend or payment date in the next 7 days across YieldMax, Roundhill and Defiance, sorted chronologically.",
    fetcher: () => getThisWeekDividends(60),
  },
  "dividend-calendar-this-month": {
    slug: "dividend-calendar-this-month",
    title: "Dividend Calendar This Month | Ex-Dividend & Payment Dates",
    h1: "Dividend Calendar — This Month",
    description:
      "Every ETF with an ex-dividend or payment date in the next 31 days across YieldMax, Roundhill and Defiance, sorted chronologically.",
    fetcher: () => getThisMonthDividends(150),
  },
  "yieldmax-dividend-calendar": {
    slug: "yieldmax-dividend-calendar",
    title: "YieldMax Dividend Calendar | Full Upcoming Payment Schedule",
    h1: "YieldMax Dividend Calendar",
    description:
      "Every published YieldMax ETF ex-dividend and payment date on record, sorted chronologically — the calendar view of the YieldMax lineup, as opposed to the yield-ranked YieldMax ETFs list.",
    fetcher: () => getUpcomingDividendsByProvider("yieldmax", 80),
  },
};

export const CALENDAR_HUB_IDS = Object.keys(CALENDAR_HUB_DEFINITIONS) as CalendarHubId[];

export function isCalendarHubSlug(slug: string): slug is CalendarHubId {
  return slug in CALENDAR_HUB_DEFINITIONS;
}
