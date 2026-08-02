import { describe, it, expect } from "vitest";
import { getRelevantGuidesForEtf } from "./topicalLinks";

describe("getRelevantGuidesForEtf", () => {
  it("always includes the 8 universal guides", () => {
    const guides = getRelevantGuidesForEtf({ provider_id: "roundhill" }, null);
    expect(guides).toContain("covered-call-etf-guide");
    expect(guides).toContain("distribution-schedule-guide");
    expect(guides).toContain("ex-dividend-date-guide");
    expect(guides).toContain("payment-date-guide");
    expect(guides).toContain("distribution-rate-guide");
    expect(guides).toContain("sec-yield-guide");
    expect(guides).toContain("nav-erosion-guide");
    expect(guides).toContain("return-of-capital-guide");
  });

  it("does not add monthly-vs-weekly when frequency is unknown", () => {
    const guides = getRelevantGuidesForEtf({ provider_id: "roundhill" }, null);
    expect(guides).not.toContain("monthly-vs-weekly-dividend-etfs");
  });

  it("adds monthly-vs-weekly when frequency is known", () => {
    const guides = getRelevantGuidesForEtf({ provider_id: "roundhill" }, "weekly");
    expect(guides).toContain("monthly-vs-weekly-dividend-etfs");
  });

  it("adds yieldmax-guide only for yieldmax-issued funds", () => {
    expect(getRelevantGuidesForEtf({ provider_id: "yieldmax" }, "weekly")).toContain("yieldmax-guide");
    expect(getRelevantGuidesForEtf({ provider_id: "defiance" }, "weekly")).not.toContain("yieldmax-guide");
  });
});
