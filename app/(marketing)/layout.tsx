import type { Metadata, Viewport } from "next";

// Public tanıtım yüzeyi: sinematik KOYU tema. `.theme-marketing` token'ları
// koyuya çevirir (globals.css) ve bu kapsam /app'teki açık uygulamaya sızmaz.
export const metadata: Metadata = {
  title: "reypo — vision, engineered",
  description:
    "reypo — software & creative studio. Immersive web, creative motion, brand strategy and AI integration, orbiting a cinematic aperture.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#04050a",
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="theme-marketing flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      {children}
    </div>
  );
}
