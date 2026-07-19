import type { Viewport } from "next";

// Giriş / şifre belirleme ekranları görev uygulamasının parçası: AÇIK tema.
// Varsayılan :root zaten açık (globals.css), burada yalnızca viewport'u sabitleriz.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-dvh flex-1 flex-col">{children}</div>;
}
