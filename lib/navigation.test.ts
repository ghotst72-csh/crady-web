import { describe, it, expect } from "vitest";
import { NAVIGATION, NAV_HOME, resolveHref, isChildActive } from "./navigation";

describe("NAVIGATION data integrity", () => {
  it("every section has at least one real child", () => {
    for (const section of NAVIGATION) {
      expect(section.children.length).toBeGreaterThan(0);
    }
  });

  it("every href is a real absolute path starting with /", () => {
    for (const section of NAVIGATION) {
      for (const child of section.children) {
        expect(child.href.startsWith("/")).toBe(true);
      }
    }
  });

  it("has no duplicate keys across sections or children", () => {
    const sectionKeys = NAVIGATION.map((s) => s.key);
    expect(new Set(sectionKeys).size).toBe(sectionKeys.length);

    const childKeys = NAVIGATION.flatMap((s) => s.children.map((c) => `${s.key}/${c.key}`));
    expect(new Set(childKeys).size).toBe(childKeys.length);
  });

  // CRADY Homepage Final Redesign (2026-08-12): the approved homepage mock
  // places ETF Calculator and the Covered Call Guide first, ahead of
  // Dividend Predictions — promoted from nested submenu children (3 levels
  // deep under "High-Yield ETFs" / "Learn") to top-level sections,
  // superseding the earlier "Predictions is literally first" brand-
  // positioning call this test used to assert.
  it("ETF Calculator and Covered Call Guide are the first two sections after Home, per the approved homepage design", () => {
    expect(NAVIGATION[0].key).toBe("etf-calculator-top");
    expect(NAVIGATION[1].key).toBe("covered-call-guide");
  });

  it("Dividend Predictions follows immediately after the two promoted tool destinations", () => {
    expect(NAVIGATION[2].key).toBe("predictions");
  });
});

describe("resolveHref", () => {
  it("returns the EN href unchanged for lang=en", () => {
    expect(resolveHref({ key: "x", label: { en: "X", ko: "X" }, href: "/distributions" }, "en")).toBe(
      "/distributions"
    );
  });

  it("prefixes /ko for lang=ko by default", () => {
    expect(resolveHref({ key: "x", label: { en: "X", ko: "X" }, href: "/distributions" }, "ko")).toBe(
      "/ko/distributions"
    );
  });

  it("uses an explicit koHref override instead of prefixing (Magazine has no Korean route tree)", () => {
    expect(
      resolveHref({ key: "magazine", label: { en: "Magazine", ko: "매거진" }, href: "/magazine", koHref: "/magazine" }, "ko")
    ).toBe("/magazine");
  });

  it("resolves Home correctly for both languages", () => {
    expect(resolveHref(NAV_HOME, "en")).toBe("/");
    expect(resolveHref(NAV_HOME, "ko")).toBe("/ko");
  });
});

describe("isChildActive", () => {
  it("matches an exact path", () => {
    expect(isChildActive("/distributions", "/distributions")).toBe(true);
  });

  it("matches a real sub-path (e.g. a distribution announcement detail page)", () => {
    expect(isChildActive("/distributions/2026-08-05-yieldmax-group-2", "/distributions")).toBe(true);
  });

  it("does not match an unrelated path that merely shares a prefix string", () => {
    expect(isChildActive("/distributions-archive-unrelated", "/distributions")).toBe(false);
  });

  it("does not treat every path as active for Home (the naive startsWith('/') trap)", () => {
    expect(isChildActive("/ranking", "/")).toBe(false);
    expect(isChildActive("/", "/")).toBe(true);
  });

  it("handles the Korean home path the same way", () => {
    expect(isChildActive("/ko/ranking", "/ko")).toBe(false);
    expect(isChildActive("/ko", "/ko")).toBe(true);
  });
});
