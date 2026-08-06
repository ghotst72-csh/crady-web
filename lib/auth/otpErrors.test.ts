import { describe, it, expect } from "vitest";
import { classifySendError, classifyVerifyError, isWellFormedOtpCode } from "./otpErrors";

function authError(overrides: { name?: string; message?: string; status?: number; code?: string }) {
  return { name: "AuthApiError", message: "x", status: 400, ...overrides };
}

describe("isWellFormedOtpCode", () => {
  it("accepts exactly the real 8-digit length this project's Supabase instance issues", () => {
    expect(isWellFormedOtpCode("12345678")).toBe(true);
    expect(isWellFormedOtpCode("30038211")).toBe(true); // a real code received in production
  });
  it("rejects the old 6-digit GoTrue default — this project does not use it", () => {
    expect(isWellFormedOtpCode("123456")).toBe(false);
  });
  it("rejects anything shorter, longer, non-numeric, or empty", () => {
    expect(isWellFormedOtpCode("1234567")).toBe(false); // 7 digits
    expect(isWellFormedOtpCode("123456789")).toBe(false); // 9 digits
    expect(isWellFormedOtpCode("12345")).toBe(false);
    expect(isWellFormedOtpCode("")).toBe(false);
    expect(isWellFormedOtpCode("12a45678")).toBe(false);
  });
});

describe("classifySendError", () => {
  it("maps the confirmed rate-limit codes (same ones the Flutter app handles) to rate_limited", () => {
    for (const code of ["over_email_send_rate_limit", "over_request_rate_limit", "over_sms_send_rate_limit"]) {
      expect(classifySendError(authError({ code })).kind).toBe("rate_limited");
    }
  });

  it("maps HTTP 429 without a recognized code to rate_limited", () => {
    expect(classifySendError(authError({ status: 429, code: undefined })).kind).toBe("rate_limited");
  });

  it("maps 5xx to config_error rather than a generic send failure", () => {
    expect(classifySendError(authError({ status: 500 })).kind).toBe("config_error");
  });

  it("maps a plain TypeError (fetch failure) to network_error", () => {
    expect(classifySendError(new TypeError("Failed to fetch")).kind).toBe("network_error");
  });

  it("falls back to send_failed for an unrecognized 4xx AuthApiError", () => {
    expect(classifySendError(authError({ status: 400, code: "something_else" })).kind).toBe("send_failed");
  });
});

describe("classifyVerifyError", () => {
  it("maps the real otp_expired code (confirmed live against this project — covers both wrong AND expired codes) to 'expired'", () => {
    const result = classifyVerifyError(authError({ status: 403, code: "otp_expired", message: "Token has expired or is invalid" }));
    expect(result.kind).toBe("expired");
  });

  it("maps rate-limit codes during verify to rate_limited too", () => {
    expect(classifyVerifyError(authError({ code: "over_request_rate_limit" })).kind).toBe("rate_limited");
  });

  it("maps 5xx to config_error", () => {
    expect(classifyVerifyError(authError({ status: 500 })).kind).toBe("config_error");
  });

  it("maps a network failure to network_error", () => {
    expect(classifyVerifyError(new TypeError("Failed to fetch")).kind).toBe("network_error");
  });

  it("falls back to invalid for any other AuthApiError", () => {
    expect(classifyVerifyError(authError({ status: 400, code: "unexpected_failure" })).kind).toBe("invalid");
  });

  it("never leaks the raw error message into the user-facing message", () => {
    const result = classifyVerifyError(authError({ code: "otp_expired", message: "Token has expired or is invalid" }));
    expect(result.message.en).not.toContain("Token has expired or is invalid");
    expect(result.raw.message).toBe("Token has expired or is invalid");
  });
});
