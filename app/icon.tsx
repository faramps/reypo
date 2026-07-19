import { ImageResponse } from "next/og";

// Gerçek marka logosu gelene kadar yer tutucu; admin/tasarımcı sonradan değiştirebilir.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
    { ...size }
  );
}
