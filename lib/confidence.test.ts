import { describe, it, expect } from "vitest";
import { normalizeConfidencePct, formatConfidencePct } from "./confidence";

describe("normalizeConfidencePct", () => {
  it("converts a 0-1 fraction to a 0-100 percentage", () => {
    expect(normalizeConfidencePct(0.8378)).toBeCloseTo(83.78, 5);
  });

  it("leaves an already 0-100 value unchanged", () => {
    expect(normalizeConfidencePct(83.78)).toBeCloseTo(83.78, 5);
  });

  it("treats exactly 1 as a 0-1 fraction (100%), not 1%", () => {
    expect(normalizeConfidencePct(1)).toBe(100);
  });

  it("never returns above 100, even for a bad out-of-range input", () => {
    expect(normalizeConfidencePct(8378)).toBe(100);
    expect(normalizeConfidencePct(150)).toBe(100);
  });

  it("never returns below 0", () => {
    expect(normalizeConfidencePct(-5)).toBe(0);
    expect(normalizeConfidencePct(-0.2)).toBe(0);
  });

  it("handles 0 correctly on both scales", () => {
    expect(normalizeConfidencePct(0)).toBe(0);
  });
});

describe("formatConfidencePct", () => {
  it("matches the two documented examples exactly", () => {
    expect(formatConfidencePct(0.8378)).toBe("83.8%");
    expect(formatConfidencePct(83.78)).toBe("83.8%");
  });

  it("returns null for missing data, never a fabricated value", () => {
    expect(formatConfidencePct(null)).toBeNull();
    expect(formatConfidencePct(undefined)).toBeNull();
  });

  it("supports 0 decimal digits for call sites that want a whole percent", () => {
    expect(formatConfidencePct(83.78, 0)).toBe("84%");
    expect(formatConfidencePct(0.78, 0)).toBe("78%");
  });

  it("never produces an impossible value like the reported 8378% bug", () => {
    // The exact real-world value that produced the bug report (ULTY's
    // next_predictions.confidence_score), formatted the old buggy way
    // would have been (83.78 * 100).toFixed(0) === "8378".
    expect(formatConfidencePct(83.78, 0)).toBe("84%");
  });
});
