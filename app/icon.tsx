import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Browser-tab favicon — the hex-C brand symbol (see
 * components/branding/Logo.tsx for the same facet geometry/colors, the
 * single source of truth this mirrors). Replaces the previous app/icon.png,
 * an unrelated cup/mug graphic left over from before the CRADY Homepage
 * Final Redesign (2026-08-12) brand direction. */
export default function Icon() {
  return new ImageResponse(
    (
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <polygon points="73,10.16 27,10.16 38,29.2 62,29.2" fill="#93C5FD" />
        <polygon points="27,10.16 4,50 26,50 38,29.2" fill="#3B82F6" />
        <polygon points="4,50 27,89.84 38,70.8 26,50" fill="#2563EB" />
        <polygon points="27,89.84 73,89.84 62,70.8 38,70.8" fill="#1D4ED8" />
      </svg>
    ),
    { ...size }
  );
}
