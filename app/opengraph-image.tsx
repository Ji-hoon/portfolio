import { ImageResponse } from "next/og";

export const alt = "Jihoon Kim — Designer · Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 역할(?r=) 변형과 무관한 공통 이미지 — 회전 슬롯처럼 정체성은 하나로 고정한다.
// 텍스트는 기본 내장 폰트로 렌더 가능한 영문만 사용한다.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          padding: "0 96px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#111111",
            letterSpacing: "-0.03em",
          }}
        >
          Jihoon Kim
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 46,
            fontWeight: 600,
            color: "#2563eb",
            marginTop: 20,
          }}
        >
          Designer · Engineer
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#6b7280",
            marginTop: 48,
          }}
        >
          10+ yrs product design · 2 yrs frontend engineering
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            color: "#9ca3af",
            marginTop: 72,
          }}
        >
          jihoonkim.com
        </div>
      </div>
    ),
    { ...size },
  );
}
