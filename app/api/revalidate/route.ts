import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ARTICLE_TYPE_SLUG } from "@/lib/magazine/recipes";
import { HUB_IDS } from "@/lib/magazine/hubs";
import { CALENDAR_HUB_IDS } from "@/lib/magazine/calendarHubs";
import type { ArticleTypeId } from "@/lib/magazine/types";

export const dynamic = "force-dynamic";

const ARTICLE_TYPES = Object.keys(ARTICLE_TYPE_SLUG) as ArticleTypeId[];

/** On-demand ISR revalidation, called by the CRADY pipeline's fast path
 * (run_fast_path.py) right after a new official distribution has been
 * ingested and every dependent derived value (predictions, CRADY Score,
 * dividend stability, Activity Engine) has been recalculated — see the
 * "CRADY YieldMax Real-Time Distribution Update System" spec, requirement
 * #7. Every page in this repo was previously pure time-based ISR
 * (`export const revalidate = N`, up to 21600s) with zero on-demand
 * invalidation anywhere — this route is that missing mechanism.
 *
 * Deliberately revalidates the full fixed set of hub/calendar-hub pages
 * (only 12 total, see lib/magazine/hubs.ts + calendarHubs.ts) rather than
 * trying to infer exactly which hub a given ticker belongs to (provider,
 * payout frequency, etc.) — `revalidatePath` is cheap, and correctness/
 * freshness matters more here than shaving a handful of extra calls.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "REVALIDATE_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tickers?: string[]; announcementSlugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const tickers = (body.tickers ?? []).map((t) => t.toLowerCase());
  const announcementSlugs = body.announcementSlugs ?? [];
  const revalidated: string[] = [];

  const paths: string[] = [
    "/",
    "/ko",
    "/next-dividend",
    "/ko/next-dividend",
    "/distributions",
    "/ko/distributions",
    "/distributions/archive",
    "/ko/distributions/archive",
    "/ranking",
    "/ko/ranking",
    "/compare",
    "/ko/compare",
    "/calendar",
    "/ko/calendar",
    "/portfolio",
    "/ko/portfolio",
    "/weekly-intelligence",
    "/ko/weekly-intelligence",
    "/monthly-intelligence",
    "/ko/monthly-intelligence",
    "/magazine",
    "/sitemap.xml",
  ];

  for (const slug of announcementSlugs) {
    paths.push(`/distributions/${slug}`, `/ko/distributions/${slug}`);
  }

  for (const ticker of tickers) {
    paths.push(`/${ticker}`, `/ko/${ticker}`);
    for (const type of ARTICLE_TYPES) {
      paths.push(`/magazine/${ticker}-${ARTICLE_TYPE_SLUG[type]}`);
    }
  }

  for (const hub of HUB_IDS) paths.push(`/magazine/${hub}`);
  for (const hub of CALENDAR_HUB_IDS) paths.push(`/magazine/${hub}`);

  for (const path of paths) {
    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch (err) {
      // A single bad path (e.g. a malformed ticker) must not abort the
      // rest of the revalidation batch.
      console.error(`[revalidate] failed for ${path}:`, err);
    }
  }

  return NextResponse.json({
    revalidated: true,
    count: revalidated.length,
    paths: revalidated,
  });
}
