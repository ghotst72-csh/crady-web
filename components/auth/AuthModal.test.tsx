import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthModal } from "./AuthModal";

const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: () => ({
    auth: { signInWithOtp, verifyOtp },
    from,
  }),
}));

const RATE_LIMIT_ERROR = { name: "AuthApiError", message: "For security purposes...", status: 429, code: "over_email_send_rate_limit" };
const OTP_EXPIRED_ERROR = { name: "AuthApiError", message: "Token has expired or is invalid", status: 403, code: "otp_expired" };

async function sendCode(user: ReturnType<typeof userEvent.setup>, email = "user@example.com") {
  await user.type(screen.getByLabelText("Email"), email);
  await user.click(screen.getByRole("button", { name: "Send code" }));
}

beforeEach(() => {
  signInWithOtp.mockReset().mockResolvedValue({ error: null });
  verifyOtp.mockReset();
  maybeSingle.mockReset().mockResolvedValue({ data: { user_id: "u1" } }); // has a profile already, by default
});

afterEach(() => {
  // Guards against a fake-timer test leaving the clock faked if it throws
  // before reaching its own vi.useRealTimers() — a leak here would hang
  // every later test's findBy*/waitFor (which poll via real setTimeout).
  vi.useRealTimers();
});

describe("AuthModal — sending the code", () => {
  it("sends the code and advances to the OTP step on success", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user);
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "user@example.com", options: { shouldCreateUser: true } });
    expect(await screen.findByLabelText("Verification code")).toBeInTheDocument();
  });

  it("normalizes the email (trim + lowercase) before sending", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user, "  User@Example.com  ");
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "user@example.com", options: { shouldCreateUser: true } });
  });

  it("shows a classified error and stays on the email step when the send fails", async () => {
    signInWithOtp.mockResolvedValue({ error: RATE_LIMIT_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user);
    expect(await screen.findByText(/requested too many codes/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Verification code")).not.toBeInTheDocument();
  });

  it("does not double-send on a rapid duplicate submit", async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    signInWithOtp.mockReturnValue(new Promise((resolve) => (resolveFirst = resolve)));
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("Email"), "user@example.com");
    const button = screen.getByRole("button", { name: "Send code" });
    await user.click(button);
    await user.click(button); // second click while the first request is still in flight
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    resolveFirst({ error: null });
  });
});

describe("AuthModal — verifying the code", () => {
  async function reachOtpStep(user: ReturnType<typeof userEvent.setup>) {
    await sendCode(user);
    await screen.findByLabelText("Verification code");
  }

  it("verifies a correct 8-digit code (this project's real OTP length) and closes on success", async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AuthModal onClose={onClose} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(verifyOtp).toHaveBeenCalledWith({ email: "user@example.com", token: "12345678", type: "email" });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("shows an 8-digit placeholder, not the old 6-digit one", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    expect(screen.getByLabelText("Verification code")).toHaveAttribute("placeholder", "12345678");
  });

  it("caps the input at 8 digits — typing more never produces a longer value", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    const input = screen.getByLabelText("Verification code") as HTMLInputElement;
    expect(input).toHaveAttribute("maxlength", "8");
    await user.type(input, "1234567890"); // 10 digits typed
    expect(input.value).toBe("12345678"); // only the first 8 land in state
  });

  it("pasting a real 8-digit production code preserves every digit exactly, with no transformation", async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    const input = screen.getByLabelText("Verification code") as HTMLInputElement;
    await user.click(input);
    await user.paste("30038211"); // the exact real code example confirmed in production
    expect(input.value).toBe("30038211");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(verifyOtp).toHaveBeenCalledWith({ email: "user@example.com", token: "30038211", type: "email" });
  });

  it("keeps Verify disabled for a 6-digit code — the old GoTrue default is no longer accepted as well-formed", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "123456");
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps Verify disabled for a 7-digit code (one short of the real length)", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "1234567");
    expect(screen.getByRole("button", { name: "Verify" })).toBeDisabled();
  });

  it("shows a wrong/expired-code error and keeps the OTP screen visible (never falls back to the email step)", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: OTP_EXPIRED_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeInTheDocument();
  });

  it("a verify failure is never mislabeled as a send failure", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: OTP_EXPIRED_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
    expect(screen.queryByText(/couldn't send/i)).not.toBeInTheDocument();
  });

  it("re-submitting the same wrong code shows the error again without crashing", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: OTP_EXPIRED_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByText(/expired/i);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(verifyOtp).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
  });

  it("typing a new code clears the previous error", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: OTP_EXPIRED_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByText(/expired/i);
    await user.clear(screen.getByLabelText("Verification code"));
    await user.type(screen.getByLabelText("Verification code"), "1");
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
  });

  it("routes a first-ever sign-in to the display-name step instead of closing", async () => {
    verifyOtp.mockResolvedValue({ data: { user: { id: "new-user" } }, error: null });
    maybeSingle.mockResolvedValue({ data: null }); // no activity_profiles row yet
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AuthModal onClose={onClose} />);
    await reachOtpStep(user);
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("Choose a display name")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("AuthModal — resend and email change", () => {
  it("shows a cooldown instead of allowing an immediate duplicate resend", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user);
    await screen.findByLabelText("Verification code");
    expect(screen.getByRole("button", { name: /0:/ })).toBeDisabled();
  });

  // These two jump Date.now() far into the future rather than faking
  // setTimeout/setInterval wholesale — vitest's fake timers fight with
  // userEvent's internal act()/RAF usage and RTL's findBy*/waitFor (which
  // poll via real setTimeout), causing hangs. Spying on Date.now alone lets
  // the component's real 1s interval keep ticking on the real clock; the
  // very next tick reads the jumped-forward mocked time and the cooldown
  // reads as elapsed, without needing to fake the event loop at all.
  it("resends via the dedicated resend control once the cooldown elapses, and clears the stale code", async () => {
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user); // cooldownUntil is computed from the real, un-mocked clock here
    await screen.findByLabelText("Verification code");
    await user.type(screen.getByLabelText("Verification code"), "123");

    // Only now jump Date.now() forward, so cooldownUntil stays fixed at its
    // original (real-time) value while every later read of "now" is past it.
    const jumpedNow = Date.now() + 40_000;
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(jumpedNow);
    await waitFor(() => expect(screen.getByRole("button", { name: "Resend code" })).not.toBeDisabled(), { timeout: 2000 });

    signInWithOtp.mockClear();
    await user.click(screen.getByRole("button", { name: "Resend code" }));
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "user@example.com", options: { shouldCreateUser: true } });
    expect((screen.getByLabelText("Verification code") as HTMLInputElement).value).toBe("");
    dateSpy.mockRestore();
  });

  it("does not double-resend on a rapid duplicate click once the cooldown has elapsed", async () => {
    let resolveResend: (v: unknown) => void = () => {};
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user); // cooldownUntil is computed from the real, un-mocked clock here
    await screen.findByLabelText("Verification code");
    const jumpedNow = Date.now() + 40_000;
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(jumpedNow);
    await waitFor(() => expect(screen.getByRole("button", { name: "Resend code" })).not.toBeDisabled(), { timeout: 2000 });

    signInWithOtp.mockClear();
    signInWithOtp.mockReturnValue(new Promise((resolve) => (resolveResend = resolve)));
    const resendButton = screen.getByRole("button", { name: "Resend code" });
    await user.click(resendButton);
    await user.click(resendButton); // second click while the first resend is still in flight
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    resolveResend({ error: null });
    dateSpy.mockRestore();
  });

  it("going back to a different email clears the OTP screen's error and code", async () => {
    verifyOtp.mockResolvedValue({ data: { user: null }, error: OTP_EXPIRED_ERROR });
    const user = userEvent.setup();
    render(<AuthModal onClose={vi.fn()} />);
    await sendCode(user);
    await screen.findByLabelText("Verification code");
    await user.type(screen.getByLabelText("Verification code"), "12345678");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await screen.findByText(/expired/i);

    await user.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();

    // The previous address is intentionally preserved (no need to retype an
    // unchanged email) — clear it explicitly to simulate switching accounts.
    await user.clear(screen.getByLabelText("Email"));
    signInWithOtp.mockClear();
    await sendCode(user, "second@example.com");
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "second@example.com", options: { shouldCreateUser: true } });
  });
});

describe("AuthModal — remount gives a clean initial state", () => {
  it("shows the email step fresh after unmount + remount, with no leftover error", () => {
    const { unmount } = render(<AuthModal onClose={vi.fn()} />);
    unmount();
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AuthModal — localization", () => {
  it("renders Korean copy end to end, including the classified error message", async () => {
    signInWithOtp.mockResolvedValue({ error: RATE_LIMIT_ERROR });
    const user = userEvent.setup();
    render(<AuthModal lang="ko" onClose={vi.fn()} />);
    expect(screen.getByText("CRADY 로그인")).toBeInTheDocument();
    await user.type(screen.getByLabelText("이메일"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "인증코드 보내기" }));
    expect(await screen.findByText(/너무 자주 요청했습니다/)).toBeInTheDocument();
  });

  it("renders English copy by default", () => {
    render(<AuthModal onClose={vi.fn()} />);
    expect(screen.getByText("Sign in to CRADY")).toBeInTheDocument();
  });
});
