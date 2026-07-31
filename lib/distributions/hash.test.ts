import { describe, it, expect } from "vitest";
import { computeAnnouncementHash } from "./hash";

describe("computeAnnouncementHash", () => {
  const base = {
    title: "YieldMax® ETFs Announces Weekly Distributions for Group 2 ETFs",
    announcementDate: "2026-07-29",
    rows: { MSTY: 0.2222, TSLY: 0.2147 },
  };

  it("is deterministic for the same input", () => {
    expect(computeAnnouncementHash(base)).toBe(computeAnnouncementHash(base));
  });

  it("is independent of row insertion order", () => {
    const reordered = { ...base, rows: { TSLY: 0.2147, MSTY: 0.2222 } };
    expect(computeAnnouncementHash(base)).toBe(computeAnnouncementHash(reordered));
  });

  it("changes when an amount changes", () => {
    const changed = { ...base, rows: { ...base.rows, MSTY: 0.9999 } };
    expect(computeAnnouncementHash(base)).not.toBe(computeAnnouncementHash(changed));
  });

  it("changes when a ticker is added or removed", () => {
    const added = { ...base, rows: { ...base.rows, CONY: 0.2942 } };
    expect(computeAnnouncementHash(base)).not.toBe(computeAnnouncementHash(added));
  });

  it("changes when the title changes", () => {
    const retitled = { ...base, title: base.title + " (Corrected)" };
    expect(computeAnnouncementHash(base)).not.toBe(computeAnnouncementHash(retitled));
  });

  it("produces a 64-character hex sha256 digest", () => {
    expect(computeAnnouncementHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});
