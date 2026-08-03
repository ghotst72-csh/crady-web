/** Structured, privacy-safe diagnostic logging for the OTP login flow.
 * Never pass an OTP code, access token, or session value here — only the
 * fields needed to diagnose a failure: which call, which UI phase, the
 * normalized-email shape (redacted), and the raw Supabase error fields. */

function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local[0]}${"*".repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export type AuthLogEvent = {
  call: "signInWithOtp" | "verifyOtp" | "resend" | "onAuthStateChange" | "getSession";
  phase: string;
  email?: string;
  emailWasNormalized?: boolean;
  otpType?: "email";
  authEvent?: string;
  error?: { name?: string; message?: string; status?: number; code?: string };
};

export function logAuthEvent(event: AuthLogEvent): void {
  const { email, ...rest } = event;
  const entry = {
    ...rest,
    email: email ? redactEmail(email) : undefined,
    timestamp: new Date().toISOString(),
  };
  if (event.error) {
    console.error("[auth]", entry);
  } else {
    console.info("[auth]", entry);
  }
}
