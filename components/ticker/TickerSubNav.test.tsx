import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TickerSubNav } from "./TickerSubNav";

describe("TickerSubNav", () => {
  it("links to the three real, already-existing page sections only", () => {
    render(<TickerSubNav lang="en" />);
    expect(screen.getByText("Overview").closest("a")).toHaveAttribute("href", "#overview");
    expect(screen.getByText("Dividends").closest("a")).toHaveAttribute("href", "#dividends");
    expect(screen.getByText("Prediction History").closest("a")).toHaveAttribute("href", "#prediction-history");
  });

  it("renders Korean labels for lang=ko with the same real anchors", () => {
    render(<TickerSubNav lang="ko" />);
    expect(screen.getByText("개요").closest("a")).toHaveAttribute("href", "#overview");
    expect(screen.getByText("예측 기록").closest("a")).toHaveAttribute("href", "#prediction-history");
  });
});
