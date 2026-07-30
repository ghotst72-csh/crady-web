import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CRADY — High Dividend ETF Calendar & Distribution Tracker";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 900, color: "#111111" }}>
          CRA<span style={{ color: "#f59e0b" }}>DY</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#525252" }}>
          High Dividend ETF Calendar &amp; Distribution Tracker
        </div>
        <div style={{ display: "flex", marginTop: 48, fontSize: 24, color: "#9e9e9e" }}>
          YieldMax · Defiance · Roundhill
        </div>
      </div>
    ),
    { ...size }
  );
}
