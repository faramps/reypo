import { ImageResponse } from "next/og";

// manifest.ts'in icons dizisi için — özel bir yol (icon-192 file convention'ı
// DEĞİL) kullanıyoruz ki ayrıca <head>'e otomatik favicon linki eklenmesin.
export async function GET() {
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
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
    { width: 192, height: 192 }
  );
}
