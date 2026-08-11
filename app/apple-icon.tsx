import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS home-screen icon — solid backdrop (Apple touch icons should not be
 * transparent), same hex-C symbol as app/icon.tsx / Logo.tsx. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1220",
        }}
      >
        <svg width="70%" height="70%" viewBox="0 0 100 100" fill="none">
          <polygon points="73,10.16 27,10.16 38,29.2 62,29.2" fill="#93C5FD" />
          <polygon points="27,10.16 4,50 26,50 38,29.2" fill="#3B82F6" />
          <polygon points="4,50 27,89.84 38,70.8 26,50" fill="#2563EB" />
          <polygon points="27,89.84 73,89.84 62,70.8 38,70.8" fill="#60A5FA" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
