import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INDEXNOW_KEY } from "@/lib/constants";

const CANONICAL_HOST = "crady.net";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IndexNow key file (https://www.indexnow.org/documentation) must be
  // served at the site root as plain text. A dedicated route would collide
  // with the [ticker] dynamic segment, so it's handled here instead.
  if (pathname === `/${INDEXNOW_KEY}.txt`) {
    return new NextResponse(INDEXNOW_KEY, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const host = request.headers.get("host") ?? "";
  const response = NextResponse.next();

  // crady.net is the only host Google/Bing should index. Vercel's own
  // *.vercel.app domain (production alias + every preview deployment) stays
  // reachable for internal QA, but gets a hard noindex here so it can never
  // compete with or dilute crady.net in search results — independent of
  // whether canonical tags are respected by a given crawler.
  if (!host.endsWith(CANONICAL_HOST)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Apply to all paths except static assets and Next internals, which
     * don't carry meaningful SEO signal anyway.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
