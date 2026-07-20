import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// PWA install icon (referenced by manifest.ts). Renders the brand logo centred
// on the manifest's white background at the size the OS asks for. Özel bir yol
// (icon-192 file convention'ı DEĞİL) ki <head>'e ayrıca favicon linki eklenmesin.
const SIZE = 192;

export async function GET() {
  const logo = await readFile(join(process.cwd(), "public", "logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* logo is 410×474 — keep aspect, ~70% of the tile (safe margin) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="reypo"
          height={Math.round(SIZE * 0.7)}
          width={Math.round(SIZE * 0.7 * (410 / 474))}
        />
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
