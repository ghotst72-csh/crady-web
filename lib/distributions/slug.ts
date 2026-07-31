/** Slugifies an arbitrary text fragment into a URL-safe, lowercase, hyphenated
 * segment — used only as the last-resort fallback below. */
export function slugifyTitleFragment(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Picks a short, human-recognizable discriminator out of a press-release
 * title, tried in order: "Group N" / "Target N" (YieldMax's own grouping
 * language), then bare all-caps ticker symbols named in the title (e.g.
 * "Announces Distributions on BIGY, RNTY and SOXY"), then a slugified
 * fragment of the title itself as a last resort. Never throws, never
 * returns empty. */
export function extractAnnouncementDiscriminator(title: string): string {
  const groupMatch = title.match(/group\s+(\d+)/i);
  if (groupMatch) return `group-${groupMatch[1]}`;

  const targetMatch = title.match(/target\s+(\d+)/i);
  if (targetMatch) return `target-${targetMatch[1]}`;

  // Bare all-caps tokens (2-5 letters) with no lowercase mixed in — matches
  // ticker symbols named directly in a title, and nothing else in normal
  // press-release prose (mixed-case words like "YieldMax" or "ETFs" don't
  // qualify since \b requires a full run of only uppercase letters).
  const tickerMatches = title.match(/\b[A-Z]{2,5}\b/g);
  if (tickerMatches && tickerMatches.length > 0 && tickerMatches.length <= 6) {
    return tickerMatches.map((t) => t.toLowerCase()).join("-");
  }

  return slugifyTitleFragment(title) || "announcement";
}

/** Stable, deterministic archive-page slug — computed once at import time
 * and stored, never recomputed from a possibly-edited title later (Part 7:
 * "stable announcement pages"). Format: {date}-{provider}-{discriminator},
 * e.g. "2026-07-29-yieldmax-group-2". */
export function buildAnnouncementSlug(
  announcementDate: string,
  providerId: string,
  title: string
): string {
  return `${announcementDate}-${providerId}-${extractAnnouncementDiscriminator(title)}`;
}
