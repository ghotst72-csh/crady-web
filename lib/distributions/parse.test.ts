import { describe, it, expect } from "vitest";
import { cleanText, parseMoney, parsePercent, parseDateFlexible } from "./parse";

describe("cleanText", () => {
  it("collapses whitespace and trims", () => {
    expect(cleanText("  hello   world  \n")).toBe("hello world");
  });
  it("handles null/undefined", () => {
    expect(cleanText(null)).toBe("");
    expect(cleanText(undefined)).toBe("");
  });
});

describe("parseMoney", () => {
  it("parses a plain dollar amount", () => {
    expect(parseMoney("$0.2222")).toBe(0.2222);
  });
  it("parses with thousands separators", () => {
    expect(parseMoney("$1,234.56")).toBe(1234.56);
  });
  it("parses a negative amount", () => {
    expect(parseMoney("-$0.05")).toBe(-0.05);
  });
  it("returns null for empty or non-numeric input", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("N/A")).toBeNull();
    expect(parseMoney(null)).toBeNull();
  });
});

describe("parsePercent", () => {
  it("parses a percent value", () => {
    expect(parsePercent("90.51%")).toBe(90.51);
  });
  it("parses without the % sign too", () => {
    expect(parsePercent("3.26")).toBe(3.26);
  });
  it("returns null for empty input", () => {
    expect(parsePercent("")).toBeNull();
    expect(parsePercent(undefined)).toBeNull();
  });
});

describe("parseDateFlexible", () => {
  it("parses ISO dates", () => {
    expect(parseDateFlexible("2026-07-29")).toBe("2026-07-29");
  });
  it("parses M/D/YYYY", () => {
    expect(parseDateFlexible("7/29/2026")).toBe("2026-07-29");
  });
  it("parses zero-padded M/D/YYYY", () => {
    expect(parseDateFlexible("07/29/2026")).toBe("2026-07-29");
  });
  it("parses 'Month D, YYYY'", () => {
    expect(parseDateFlexible("July 29, 2026")).toBe("2026-07-29");
  });
  it("parses abbreviated month names", () => {
    expect(parseDateFlexible("Jul 29, 2026")).toBe("2026-07-29");
  });
  it("parses a weekday-prefixed full date", () => {
    expect(parseDateFlexible("Wednesday, July 29, 2026")).toBe("2026-07-29");
  });
  it("returns null for unparseable input", () => {
    expect(parseDateFlexible("not a date")).toBeNull();
    expect(parseDateFlexible("")).toBeNull();
    expect(parseDateFlexible(null)).toBeNull();
  });
});
