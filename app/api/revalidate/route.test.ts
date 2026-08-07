import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// route.ts imports lib/magazine/recipes -> lib/magazine/faq -> @/lib/data,
// which eagerly creates a Supabase client at module load using
// NEXT_PUBLIC_SUPABASE_URL/ANON_KEY — real in dev/prod (from .env.local),
// unset in this standalone test run. Only *creating* the client is a
// side effect of import; nothing in this route or its dependency chain
// actually calls Supabase, so a syntactically valid placeholder URL is
// enough to let module evaluation succeed.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

const revalidatePathMock = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePathMock(path),
}));

const SECRET = "test-secret-value";

function makeRequest(body: unknown, authHeader?: string) {
  return new NextRequest("https://crady.net/api/revalidate", {
    method: "POST",
    headers: authHeader ? { authorization: authHeader } : undefined,
    body: JSON.stringify(body),
  });
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    process.env.REVALIDATE_SECRET = SECRET;
  });

  it("rejects requests with no Authorization header", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["TSLY"] }));
    expect(res.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong secret", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["TSLY"] }, "Bearer wrong-secret"));
    expect(res.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("returns 500 if REVALIDATE_SECRET is not configured server-side", async () => {
    delete process.env.REVALIDATE_SECRET;
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["TSLY"] }, `Bearer ${SECRET}`));
    expect(res.status).toBe(500);
  });

  it("revalidates the fixed sitewide paths plus per-ticker and per-article-type paths", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["TSLY"] }, `Bearer ${SECRET}`));
    expect(res.status).toBe(200);

    const calledPaths = revalidatePathMock.mock.calls.map((c) => c[0]);
    expect(calledPaths).toContain("/");
    expect(calledPaths).toContain("/ko");
    expect(calledPaths).toContain("/distributions");
    expect(calledPaths).toContain("/ko/distributions");
    expect(calledPaths).toContain("/weekly-intelligence");
    expect(calledPaths).toContain("/monthly-intelligence");
    expect(calledPaths).toContain("/sitemap.xml");
    expect(calledPaths).toContain("/tsly");
    expect(calledPaths).toContain("/ko/tsly");
    expect(calledPaths).toContain("/magazine/tsly-next-dividend-prediction");
    expect(calledPaths).toContain("/magazine/tsly-dividend-guide");
  });

  it("revalidates the specific announcement slug paths when provided", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      makeRequest(
        { tickers: [], announcementSlugs: ["2026-08-05-yieldmax-group-2"] },
        `Bearer ${SECRET}`
      )
    );
    expect(res.status).toBe(200);
    const calledPaths = revalidatePathMock.mock.calls.map((c) => c[0]);
    expect(calledPaths).toContain("/distributions/2026-08-05-yieldmax-group-2");
    expect(calledPaths).toContain("/ko/distributions/2026-08-05-yieldmax-group-2");
  });

  it("revalidates every magazine hub and calendar hub regardless of which ticker changed", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["TSLY"] }, `Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const calledPaths = revalidatePathMock.mock.calls.map((c) => c[0]);
    expect(calledPaths).toContain("/magazine/yieldmax-etfs");
    expect(calledPaths).toContain("/magazine/dividend-calendar-this-week");
  });

  it("handles multiple tickers from a multi-fund release without dropping any", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeRequest({ tickers: ["BIGY", "RNTY", "SOXY"] }, `Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const calledPaths = revalidatePathMock.mock.calls.map((c) => c[0]);
    for (const t of ["bigy", "rnty", "soxy"]) {
      expect(calledPaths).toContain(`/${t}`);
      expect(calledPaths).toContain(`/ko/${t}`);
    }
  });

  it("rejects a malformed JSON body instead of throwing", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("https://crady.net/api/revalidate", {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}` },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
