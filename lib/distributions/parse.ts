/** Parsing helpers for values pulled out of scraped/fetched HTML — mirrors
 * the Python pipeline's scrapers/common.py (parse_money / parse_percent /
 * parse_date_flexible) so the two importers agree on edge cases even though
 * this one runs in Node (see the importer's own header comment for why). */

export function cleanText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function parseMoney(value: string | null | undefined): number | null {
  const cleaned = cleanText(value).replace(/\$/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function parsePercent(value: string | null | undefined): number | null {
  const cleaned = cleanText(value).replace(/%/g, "").replace(/,/g, "");
  if (!cleaned) return null;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
  september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11,
  december: 12, dec: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Accepts "July 29, 2026", "Jul 29, 2026", "7/29/2026", "2026-07-29", and a
 * day-of-week-prefixed form ("Wednesday, July 29, 2026") — returns ISO
 * 8601 (YYYY-MM-DD) or null if nothing recognizable is found. */
export function parseDateFlexible(value: string | null | undefined): string | null {
  const raw = cleanText(value);
  if (!raw) return null;

  const isoMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    return `${y}-${pad2(Number(m))}-${pad2(Number(d))}`;
  }

  // "[Weekday, ]Month D, YYYY" — the weekday prefix (if present) is simply
  // ignored rather than required, so both forms hit the same branch.
  const monthMatch = raw.match(/([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthMatch) {
    const [, monthName, day, year] = monthMatch;
    const month = MONTH_NAMES[monthName.toLowerCase()];
    if (month) return `${year}-${pad2(month)}-${pad2(Number(day))}`;
  }

  return null;
}
