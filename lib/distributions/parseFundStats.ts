import { parsePercent } from "./parse";

/** Extracts "value-then-label" Elementor heading pairs from a YieldMax
 * fund page: the big stat number renders as a plain heading div, and its
 * caption immediately follows as an <h2> — e.g. "90.51%" then "Distribution
 * Rate*". Non-greedy with a bounded lookahead window (500 chars comfortably
 * covers the handful of closing tags/attributes actually observed between
 * the two elements) so a value never accidentally pairs with a much later,
 * unrelated label. Pure string parsing — same page already fetched by
 * scrapers/yieldmax/scrape_distribution_amounts.py for the distribution
 * table, so this adds no new network traffic when merged into that scrape. */
function extractHeadingPairs(html: string): { value: string; label: string }[] {
  const pairs: { value: string; label: string }[] = [];
  const re =
    /<div class="elementor-heading-title elementor-size-default">([^<]+)<\/div>[\s\S]{0,500}?<h2 class="elementor-heading-title elementor-size-default">([^<]+)<\/h2>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    pairs.push({ value: match[1].trim(), label: match[2].trim() });
  }
  return pairs;
}

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[\s-]+/g, " ")
    .trim();
}

export type FundStats = {
  distributionRate: number | null;
  secYield30d: number | null;
};

/** Sanity bound — a distribution/yield percentage this large or negative
 * signals a parsing error (wrong pair matched, page layout changed), not a
 * real fund stat. Reject rather than write implausible "official" data. */
function isPlausiblePercent(n: number | null): n is number {
  return n != null && n >= 0 && n < 500;
}

export function parseFundStats(html: string): FundStats {
  const pairs = extractHeadingPairs(html);
  let distributionRate: number | null = null;
  let secYield30d: number | null = null;

  for (const { value, label } of pairs) {
    const normalized = normalizeLabel(label);
    if (normalized.startsWith("distribution rate") && distributionRate === null) {
      const parsed = parsePercent(value);
      if (isPlausiblePercent(parsed)) distributionRate = parsed;
    } else if (normalized.startsWith("30 day sec yield") && secYield30d === null) {
      const parsed = parsePercent(value);
      if (isPlausiblePercent(parsed)) secYield30d = parsed;
    }
  }

  return { distributionRate, secYield30d };
}
