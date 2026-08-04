import { describe, it, expect } from "vitest";
import { computeYieldPercentile } from "./yieldContext";

// 20 peers, evenly spaced 10..29 — ticker under test is 28 (2nd highest).
const PEERS = Array.from({ length: 20 }, (_, i) => 10 + i);

describe("computeYieldPercentile", () => {
  it("returns null when the ticker's own yield is null", () => {
    expect(computeYieldPercentile(null, PEERS, "en")).toBeNull();
  });

  it("returns null when the sample size is too small to be meaningful", () => {
    expect(computeYieldPercentile(50, [10, 20, 30], "en")).toBeNull();
  });

  it("labels a top-5% yield correctly", () => {
    // beaten by 1/20 = 5% -> top5
    const result = computeYieldPercentile(28, PEERS, "en");
    expect(result?.tier).toBe("top5");
    expect(result?.label).toMatch(/Top 5%/);
  });

  it("labels a below-average yield correctly", () => {
    // beaten by 15/20 = 75% -> below_average
    const result = computeYieldPercentile(13, PEERS, "en");
    expect(result?.tier).toBe("below_average");
  });

  it("returns Korean labels when lang=ko", () => {
    const result = computeYieldPercentile(28, PEERS, "ko");
    expect(result?.label).toContain("상위 5%");
  });

  it("filters out nulls from the comparison set before checking sample size", () => {
    const withNulls = [...PEERS, null, null, null];
    const result = computeYieldPercentile(28, withNulls, "en");
    expect(result?.tier).toBe("top5");
  });
});
