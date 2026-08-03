import type { AuthError } from "@supabase/supabase-js";

/** Distinct, user-facing OTP failure categories. Deliberately NOT a 1:1 map
 * of Supabase's error codes — see `classifyVerifyError` for why "invalid"
 * vs "expired" is a client-side distinction, not an API-returned one. */
export type OtpErrorKind =
  | "rate_limited"
  | "expired"
  | "invalid"
  | "send_failed"
  | "network_error"
  | "config_error";

export type OtpErrorInfo = {
  kind: OtpErrorKind;
  message: { en: string; ko: string };
  /** Raw diagnostic fields for console logging only — never rendered to the user. */
  raw: { name?: string; message?: string; status?: number; code?: string };
};

const MESSAGES: Record<OtpErrorKind, { en: string; ko: string }> = {
  invalid: {
    en: "That code didn't work. Check it and try again.",
    ko: "코드가 올바르지 않습니다.",
  },
  expired: {
    en: "That code has expired. Request a new one.",
    ko: "코드가 만료되었습니다. 새 코드를 요청해 주세요.",
  },
  rate_limited: {
    en: "You've requested too many codes. Please wait a moment and try again.",
    ko: "너무 자주 요청했습니다. 잠시 후 다시 시도해 주세요.",
  },
  send_failed: {
    en: "Couldn't send the code. Try again.",
    ko: "이메일 전송에 실패했습니다.",
  },
  network_error: {
    en: "Check your network connection and try again.",
    ko: "네트워크 연결을 확인해 주세요.",
  },
  config_error: {
    en: "A sign-in configuration error occurred. Please try again later.",
    ko: "인증 설정 오류가 발생했습니다.",
  },
};

/** Codes confirmed against this project's live Supabase instance (see
 * commit history — same codes the CRADY Flutter app's `_simplifyError`
 * already handles correctly, since both apps share one Supabase project). */
const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

function isAuthError(e: unknown): e is AuthError {
  return typeof e === "object" && e !== null && "message" in e && "name" in e;
}

function toRaw(e: unknown): OtpErrorInfo["raw"] {
  if (isAuthError(e)) {
    return { name: e.name, message: e.message, status: e.status, code: (e as { code?: string }).code };
  }
  if (e instanceof Error) return { name: e.name, message: e.message };
  return {};
}

/** Is this a genuine network failure (offline, DNS, CORS-blocked) rather than
 * a structured response from Supabase? `fetch` throws a plain TypeError for
 * these, which never reaches GoTrue's error taxonomy. */
function isNetworkFailure(e: unknown): boolean {
  return e instanceof TypeError || (e instanceof Error && e.name === "AuthRetryableFetchError");
}

export function classifySendError(e: unknown): OtpErrorInfo {
  const raw = toRaw(e);
  if (isNetworkFailure(e)) return { kind: "network_error", message: MESSAGES.network_error, raw };
  if (isAuthError(e)) {
    const code = (e as { code?: string }).code;
    if ((code && RATE_LIMIT_CODES.has(code)) || e.status === 429) {
      return { kind: "rate_limited", message: MESSAGES.rate_limited, raw };
    }
    if (e.status != null && e.status >= 500) {
      return { kind: "config_error", message: MESSAGES.config_error, raw };
    }
  }
  return { kind: "send_failed", message: MESSAGES.send_failed, raw };
}

/** Supabase's GoTrue does not distinguish "wrong code" from "expired code"
 * at the API level for OTP verification — both return the same
 * `otp_expired` / "Token has expired or is invalid" (403), confirmed live
 * against this project. Treating that code as "expired" (Supabase's own
 * name for it) and reserving "invalid" for the one case we CAN tell apart
 * ourselves — malformed input caught before ever calling the API — is
 * honest about what the API actually tells us, rather than inventing a
 * distinction it doesn't provide. */
export function classifyVerifyError(e: unknown): OtpErrorInfo {
  const raw = toRaw(e);
  if (isNetworkFailure(e)) return { kind: "network_error", message: MESSAGES.network_error, raw };
  if (isAuthError(e)) {
    const code = (e as { code?: string }).code;
    if (code === "otp_expired") return { kind: "expired", message: MESSAGES.expired, raw };
    if (e.status === 429 || (code && RATE_LIMIT_CODES.has(code))) {
      return { kind: "rate_limited", message: MESSAGES.rate_limited, raw };
    }
    if (e.status != null && e.status >= 500) {
      return { kind: "config_error", message: MESSAGES.config_error, raw };
    }
  }
  return { kind: "invalid", message: MESSAGES.invalid, raw };
}

/** Client-side pre-check, run before ever calling the API — the one case
 * where "invalid" is something we can actually determine ourselves. */
export function isWellFormedOtpCode(code: string): boolean {
  return /^\d{6,10}$/.test(code);
}
