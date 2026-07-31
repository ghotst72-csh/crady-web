import { createHash } from "crypto";

/** A stable content hash over the EXTRACTED, canonical announcement data
 * (title + date + sorted ticker:amount pairs) — not the raw HTML. Hashing
 * raw HTML would flag "changed" on every re-fetch even when the actual
 * distribution data is byte-identical (ad slots, tracking pixels, CDN
 * cache-busting query strings all mutate the raw response). This hash is
 * what the importer uses to detect a genuinely revised announcement
 * (status='corrected' in distribution_announcements) versus a no-op re-fetch. */
export function computeAnnouncementHash(input: {
  title: string;
  announcementDate: string;
  rows: Record<string, number>;
}): string {
  const sortedRows = Object.keys(input.rows)
    .sort()
    .map((ticker) => `${ticker}:${input.rows[ticker]}`)
    .join("|");
  const canonical = `${input.title}\n${input.announcementDate}\n${sortedRows}`;
  return createHash("sha256").update(canonical).digest("hex");
}
