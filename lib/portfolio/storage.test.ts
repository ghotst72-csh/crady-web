import { describe, it, expect, beforeEach } from "vitest";
import { loadPortfolio, savePortfolio, clearPortfolio } from "./storage";
import type { Holding } from "./types";

const HOLDING: Holding = {
  id: "h1",
  ticker: "TSLY",
  purchaseDate: "2025-08-15",
  shares: 500,
  investmentAmount: null,
  avgPurchasePrice: 14.2,
  dividendReinvestment: false,
};

describe("portfolio storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadPortfolio()).toEqual([]);
  });

  it("round-trips a saved holding", () => {
    savePortfolio([HOLDING]);
    expect(loadPortfolio()).toEqual([HOLDING]);
  });

  it("clearPortfolio removes everything", () => {
    savePortfolio([HOLDING]);
    clearPortfolio();
    expect(loadPortfolio()).toEqual([]);
  });

  it("ignores data from an unknown/future schema version", () => {
    window.localStorage.setItem(
      "crady:portfolio:v1",
      JSON.stringify({ schemaVersion: 99, holdings: [HOLDING], updatedAt: "x" })
    );
    expect(loadPortfolio()).toEqual([]);
  });

  it("ignores malformed JSON instead of throwing", () => {
    window.localStorage.setItem("crady:portfolio:v1", "{not json");
    expect(() => loadPortfolio()).not.toThrow();
    expect(loadPortfolio()).toEqual([]);
  });

  it("filters out entries that don't match the Holding shape", () => {
    window.localStorage.setItem(
      "crady:portfolio:v1",
      JSON.stringify({ schemaVersion: 1, holdings: [HOLDING, { garbage: true }], updatedAt: "x" })
    );
    expect(loadPortfolio()).toEqual([HOLDING]);
  });
});
