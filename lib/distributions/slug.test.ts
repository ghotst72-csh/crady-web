import { describe, it, expect } from "vitest";
import {
  slugifyTitleFragment,
  extractAnnouncementDiscriminator,
  buildAnnouncementSlug,
} from "./slug";

describe("slugifyTitleFragment", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyTitleFragment("Hello World!")).toBe("hello-world");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugifyTitleFragment("  --Weird--  ")).toBe("weird");
  });

  it("truncates long fragments", () => {
    const long = "a".repeat(100);
    expect(slugifyTitleFragment(long).length).toBeLessThanOrEqual(40);
  });
});

describe("extractAnnouncementDiscriminator", () => {
  it("extracts a Group N pattern", () => {
    expect(
      extractAnnouncementDiscriminator("YieldMax® ETFs Announces Weekly Distributions for Group 2 ETFs")
    ).toBe("group-2");
  });

  it("extracts a Target N pattern", () => {
    expect(
      extractAnnouncementDiscriminator("YieldMax® Performance & Distribution Target 25™ ETFs")
    ).toBe("target-25");
  });

  it("extracts bare all-caps tickers named in the title", () => {
    expect(
      extractAnnouncementDiscriminator("YieldMax® ETFs Announces Distributions on BIGY, RNTY and SOXY")
    ).toBe("bigy-rnty-soxy");
  });

  it("does not pick out mixed-case brand words via the ticker-token branch", () => {
    // "ETFs" and "YieldMax" are mixed-case, so they never match the bare
    // all-caps ticker regex — this title has no Group/Target pattern and no
    // qualifying ticker tokens, so it falls all the way through to the
    // generic title-slugify branch (which naturally includes those words,
    // since at that point it's slugifying the whole headline verbatim).
    const result = extractAnnouncementDiscriminator("YieldMax® ETFs Announces Weekly Distributions");
    expect(result.startsWith("yieldmax-etfs-announces")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(40);
  });

  it("falls back to a slugified title fragment when nothing else matches", () => {
    expect(extractAnnouncementDiscriminator("A totally generic announcement headline")).toBe(
      "a-totally-generic-announcement-headline"
    );
  });

  it("falls back when there are too many bare ticker-like tokens to be useful", () => {
    const manyTickers = "AAAA BBBB CCCC DDDD EEEE FFFF GGGG announced distributions";
    const result = extractAnnouncementDiscriminator(manyTickers);
    expect(result.split("-").length).not.toBe(7);
  });
});

describe("buildAnnouncementSlug", () => {
  it("matches the documented real example", () => {
    expect(
      buildAnnouncementSlug(
        "2026-07-29",
        "yieldmax",
        "YieldMax® ETFs Announces Weekly Distributions for Group 2 ETFs"
      )
    ).toBe("2026-07-29-yieldmax-group-2");
  });

  it("is stable across repeated calls with the same input", () => {
    const a = buildAnnouncementSlug("2026-06-02", "yieldmax", "YieldMax® ETFs Announces Distributions on BIGY, RNTY and SOXY");
    const b = buildAnnouncementSlug("2026-06-02", "yieldmax", "YieldMax® ETFs Announces Distributions on BIGY, RNTY and SOXY");
    expect(a).toBe(b);
  });
});
