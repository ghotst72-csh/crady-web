import { describe, it, expect } from "vitest";
import { getLocaleTargetPath, isKoreanLanguageTag, browserPrefersKorean } from "./localePath";

describe("getLocaleTargetPath — to Korean", () => {
  it("maps the home page to /ko", () => {
    expect(getLocaleTargetPath("/", "ko")).toBe("/ko");
  });

  it("preserves a ticker page", () => {
    expect(getLocaleTargetPath("/tsly", "ko")).toBe("/ko/tsly");
  });

  it("preserves /about", () => {
    expect(getLocaleTargetPath("/about", "ko")).toBe("/ko/about");
  });

  it("preserves /ranking", () => {
    expect(getLocaleTargetPath("/ranking", "ko")).toBe("/ko/ranking");
  });

  it("preserves /calendar", () => {
    expect(getLocaleTargetPath("/calendar", "ko")).toBe("/ko/calendar");
  });

  it("falls back to /ko home for Magazine (no Korean equivalent)", () => {
    expect(getLocaleTargetPath("/magazine", "ko")).toBe("/ko");
    expect(getLocaleTargetPath("/magazine/next-dividend-prediction/msty", "ko")).toBe("/ko");
  });

  it("falls back to /ko home for legal pages (no Korean equivalent)", () => {
    expect(getLocaleTargetPath("/privacy", "ko")).toBe("/ko");
    expect(getLocaleTargetPath("/terms", "ko")).toBe("/ko");
    expect(getLocaleTargetPath("/account-deletion", "ko")).toBe("/ko");
  });

  it("falls back to /ko home for other reserved paths", () => {
    expect(getLocaleTargetPath("/sitemap.xml", "ko")).toBe("/ko");
    expect(getLocaleTargetPath("/api", "ko")).toBe("/ko");
  });

  it("is a no-op when already on the Korean tree", () => {
    expect(getLocaleTargetPath("/ko/tsly", "ko")).toBe("/ko/tsly");
    expect(getLocaleTargetPath("/ko", "ko")).toBe("/ko");
  });
});

describe("getLocaleTargetPath — to English", () => {
  it("maps the Korean home page to /", () => {
    expect(getLocaleTargetPath("/ko", "en")).toBe("/");
  });

  it("preserves a ticker page", () => {
    expect(getLocaleTargetPath("/ko/tsly", "en")).toBe("/tsly");
  });

  it("preserves /ko/about", () => {
    expect(getLocaleTargetPath("/ko/about", "en")).toBe("/about");
  });

  it("preserves /ko/ranking", () => {
    expect(getLocaleTargetPath("/ko/ranking", "en")).toBe("/ranking");
  });

  it("preserves /ko/calendar", () => {
    expect(getLocaleTargetPath("/ko/calendar", "en")).toBe("/calendar");
  });

  it("is a no-op when already on the English tree", () => {
    expect(getLocaleTargetPath("/tsly", "en")).toBe("/tsly");
    expect(getLocaleTargetPath("/", "en")).toBe("/");
    expect(getLocaleTargetPath("/magazine", "en")).toBe("/magazine");
  });
});

describe("isKoreanLanguageTag", () => {
  it("recognizes ko, ko-KR, ko-KP", () => {
    expect(isKoreanLanguageTag("ko")).toBe(true);
    expect(isKoreanLanguageTag("ko-KR")).toBe(true);
    expect(isKoreanLanguageTag("ko-KP")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isKoreanLanguageTag("KO-kr")).toBe(true);
  });

  it("rejects non-Korean tags", () => {
    expect(isKoreanLanguageTag("en")).toBe(false);
    expect(isKoreanLanguageTag("en-US")).toBe(false);
    expect(isKoreanLanguageTag("ja")).toBe(false);
    expect(isKoreanLanguageTag("ja-JP")).toBe(false);
  });
});

describe("browserPrefersKorean", () => {
  it("returns false for an undefined navigator", () => {
    expect(browserPrefersKorean(undefined)).toBe(false);
  });

  it("returns true when languages includes a Korean tag", () => {
    expect(browserPrefersKorean({ languages: ["ko-KR", "en-US"], language: "ko-KR" })).toBe(true);
  });

  it("falls back to `language` when `languages` is empty", () => {
    expect(browserPrefersKorean({ languages: [], language: "ko" })).toBe(true);
  });

  it("returns false when no Korean tag is present anywhere", () => {
    expect(browserPrefersKorean({ languages: ["en-US"], language: "en-US" })).toBe(false);
  });

  it("recognizes ko-KP in the languages list", () => {
    expect(browserPrefersKorean({ languages: ["ko-KP"], language: "ko-KP" })).toBe(true);
  });
});
