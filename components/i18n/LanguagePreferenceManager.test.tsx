import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguagePreferenceManager } from "./LanguagePreferenceManager";

let pathname = "/tsly";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

const getStoredLanguagePreference = vi.fn();
const setStoredLanguagePreference = vi.fn();
const hasSeenLanguagePrompt = vi.fn();
const markLanguagePromptSeen = vi.fn();
vi.mock("@/lib/i18n/preference", () => ({
  getStoredLanguagePreference: () => getStoredLanguagePreference(),
  setStoredLanguagePreference: (lang: string) => setStoredLanguagePreference(lang),
  hasSeenLanguagePrompt: () => hasSeenLanguagePrompt(),
  markLanguagePromptSeen: () => markLanguagePromptSeen(),
}));

function stubLocation() {
  Object.defineProperty(window, "location", {
    writable: true,
    configurable: true,
    value: { href: "" },
  });
}

function stubNavigatorLanguage(language: string, languages: string[] = [language]) {
  Object.defineProperty(window.navigator, "language", { value: language, configurable: true });
  Object.defineProperty(window.navigator, "languages", { value: languages, configurable: true });
}

beforeEach(() => {
  pathname = "/tsly";
  getStoredLanguagePreference.mockReset().mockReturnValue(null);
  setStoredLanguagePreference.mockClear();
  hasSeenLanguagePrompt.mockReset().mockReturnValue(false);
  markLanguagePromptSeen.mockClear();
  stubLocation();
  stubNavigatorLanguage("en-US");
});

describe("LanguagePreferenceManager — English browser", () => {
  it("shows no recommendation card and does not redirect", () => {
    render(<LanguagePreferenceManager lang="en" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.href).toBe("");
  });
});

describe("LanguagePreferenceManager — Korean browser, no stored preference", () => {
  beforeEach(() => {
    stubNavigatorLanguage("ko-KR", ["ko-KR", "en-US"]);
  });

  it("shows the recommendation card once", () => {
    render(<LanguagePreferenceManager lang="en" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("never shows the card on the Korean tree itself", () => {
    render(<LanguagePreferenceManager lang="ko" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show the card if the prompt was already seen", () => {
    hasSeenLanguagePrompt.mockReturnValue(true);
    render(<LanguagePreferenceManager lang="en" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not auto-redirect just from browser language", () => {
    render(<LanguagePreferenceManager lang="en" />);
    expect(window.location.href).toBe("");
  });

  it("'한국어 보기' stores the Korean preference, marks the prompt seen, and navigates preserving the current page", async () => {
    const user = userEvent.setup();
    pathname = "/ranking";
    render(<LanguagePreferenceManager lang="en" />);

    await user.click(screen.getByRole("button", { name: "한국어 보기" }));

    expect(setStoredLanguagePreference).toHaveBeenCalledWith("ko");
    expect(markLanguagePromptSeen).toHaveBeenCalled();
    expect(window.location.href).toBe("/ko/ranking");
  });

  it("'Continue in English' stores the English preference, hides the card, and does not navigate", async () => {
    const user = userEvent.setup();
    render(<LanguagePreferenceManager lang="en" />);

    await user.click(screen.getByRole("button", { name: "Continue in English" }));

    expect(setStoredLanguagePreference).toHaveBeenCalledWith("en");
    expect(markLanguagePromptSeen).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.href).toBe("");
  });

  it("dismissing marks the prompt seen but stores no preference", async () => {
    const user = userEvent.setup();
    render(<LanguagePreferenceManager lang="en" />);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(markLanguagePromptSeen).toHaveBeenCalled();
    expect(setStoredLanguagePreference).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("LanguagePreferenceManager — stored preference differs from current tree", () => {
  it("redirects to the Korean equivalent when the stored preference is Korean and we're on English", () => {
    getStoredLanguagePreference.mockReturnValue("ko");
    pathname = "/calendar";
    render(<LanguagePreferenceManager lang="en" />);

    expect(window.location.href).toBe("/ko/calendar");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("redirects to the English equivalent when the stored preference is English and we're on Korean", () => {
    getStoredLanguagePreference.mockReturnValue("en");
    pathname = "/ko/calendar";
    render(<LanguagePreferenceManager lang="ko" />);

    expect(window.location.href).toBe("/calendar");
  });

  it("does not redirect when the stored preference already matches the current tree", () => {
    getStoredLanguagePreference.mockReturnValue("en");
    render(<LanguagePreferenceManager lang="en" />);

    expect(window.location.href).toBe("");
  });
});
