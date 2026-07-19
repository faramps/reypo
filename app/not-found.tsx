import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted-foreground">
        Aradığınız sayfa mevcut değil ya da görüntüleme yetkiniz yok.
      </p>
      <Link href="/" className="text-sm underline underline-offset-2">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
