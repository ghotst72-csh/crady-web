import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthProvider";

const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
const onAuthStateChange = vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { getSession, onAuthStateChange, signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  }),
}));

function OpenModalButton() {
  const { openAuthModal } = useAuth();
  return (
    <button type="button" onClick={openAuthModal}>
      trigger
    </button>
  );
}

describe("AuthProvider — language threading", () => {
  it("renders the sign-in modal in Korean when mounted with lang='ko'", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider lang="ko">
        <OpenModalButton />
      </AuthProvider>
    );
    await user.click(screen.getByRole("button", { name: "trigger" }));
    expect(await screen.findByText("CRADY 로그인")).toBeInTheDocument();
    expect(screen.queryByText("Sign in to CRADY")).not.toBeInTheDocument();
  });

  it("defaults to English when no lang is given (e.g. a caller that forgets to pass it)", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <OpenModalButton />
      </AuthProvider>
    );
    await user.click(screen.getByRole("button", { name: "trigger" }));
    expect(await screen.findByText("Sign in to CRADY")).toBeInTheDocument();
  });

  it("renders English explicitly when mounted with lang='en'", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider lang="en">
        <OpenModalButton />
      </AuthProvider>
    );
    await user.click(screen.getByRole("button", { name: "trigger" }));
    expect(await screen.findByText("Sign in to CRADY")).toBeInTheDocument();
  });
});
