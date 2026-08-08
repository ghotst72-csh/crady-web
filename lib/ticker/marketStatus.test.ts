import { describe, it, expect } from "vitest";
import { isUsMarketOpen } from "./marketStatus";

describe("isUsMarketOpen", () => {
  it("is closed on a Saturday", () => {
    // 2026-08-08 is a Saturday
    expect(isUsMarketOpen(new Date("2026-08-08T15:00:00Z"))).toBe(false);
  });

  it("is open at 11:00 ET on a Wednesday", () => {
    // 2026-08-05 is a Wednesday; 11:00 ET = 15:00 UTC (EDT, UTC-4)
    expect(isUsMarketOpen(new Date("2026-08-05T15:00:00Z"))).toBe(true);
  });

  it("is closed before 9:30 ET on a weekday", () => {
    // 08:00 ET = 12:00 UTC
    expect(isUsMarketOpen(new Date("2026-08-05T12:00:00Z"))).toBe(false);
  });

  it("is closed at/after 16:00 ET on a weekday", () => {
    // 16:00 ET = 20:00 UTC
    expect(isUsMarketOpen(new Date("2026-08-05T20:00:00Z"))).toBe(false);
  });
});
