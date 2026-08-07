import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavDrawerProvider, useNavDrawer } from "./NavDrawerProvider";
import { MobileDrawer } from "./MobileDrawer";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

function ToggleButton() {
  const { toggle } = useNavDrawer();
  return (
    <button type="button" onClick={toggle}>
      trigger
    </button>
  );
}

function Harness() {
  return (
    <NavDrawerProvider>
      <ToggleButton />
      <MobileDrawer lang="en" />
    </NavDrawerProvider>
  );
}

beforeEach(() => {
  pathname = "/";
  document.body.style.overflow = "";
});

describe("MobileDrawer + NavDrawerProvider", () => {
  it("is closed by default", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when the trigger toggles it, and shows the full shared IA", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Dividend Predictions")).toBeInTheDocument();
    expect(screen.getByText("Latest Distributions")).toBeInTheDocument();
  });

  it("locks body scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.overflow).toBe("");
    await user.click(screen.getByText("trigger"));
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(screen.getByText("trigger"));
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on backdrop click", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    await user.click(screen.getByText("trigger"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const backdrop = container.querySelector('[aria-hidden="true"].absolute.inset-0');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes via the visible X button, distinct from the backdrop", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("trigger"));
    await user.click(screen.getByLabelText("Close menu"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("throws a clear error if useNavDrawer is used outside the provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToggleButton />)).toThrow("useNavDrawer must be used within a NavDrawerProvider");
    consoleError.mockRestore();
  });
});
