import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TickerSubNav } from "./TickerSubNav";

describe("TickerSubNav", () => {
  it("links to real, already-existing page sections only", () => {
    render(<TickerSubNav lang="en" />);
    expect(screen.getByText("Overview").closest("a")).toHaveAttribute("href", "#overview");
    expect(screen.getByText("Prediction").closest("a")).toHaveAttribute("href", "#next-dividend-intelligence");
    expect(screen.getByText("History").closest("a")).toHaveAttribute("href", "#dividend-history");
    expect(screen.getByText("Risk & Score").closest("a")).toHaveAttribute("href", "#etf-intelligence");
    expect(screen.getByText("Activity").closest("a")).toHaveAttribute("href", "#etf-activity");
  });

  it("renders Korean labels for lang=ko with the same real anchors", () => {
    render(<TickerSubNav lang="ko" />);
    expect(screen.getByText("개요").closest("a")).toHaveAttribute("href", "#overview");
    expect(screen.getByText("활동").closest("a")).toHaveAttribute("href", "#etf-activity");
  });
});
