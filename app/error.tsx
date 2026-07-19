"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Bir şeyler ters gitti</h1>
      <p className="text-sm text-muted-foreground">
        Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
