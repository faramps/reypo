"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Not: E-postasız modelde (ürün kararı 2026-07-09) bu sayfaya normalde
// gelinmez; ileride e-posta tabanlı davet/sıfırlama açılırsa diye korunuyor.
// E-posta linki buraya #access_token=...&refresh_token=... ile düşer (implicit
// flow). @supabase/ssr browser client'ı flowType'ı "pkce"ye sabitlediği için
// otomatik URL algılaması sessizce başarısız olur; bu yüzden hash'i elle okuyup
// setSession() ile devreye alıyoruz — bu yol flowType kontrolüne tabi değil.
export default function SetPasswordPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">(
    "loading"
  );
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      Promise.resolve().then(() => setStatus("invalid"));
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) {
          setStatus("invalid");
          return;
        }
        // Şifre sıfırlama akışında kullanıcının zaten bir adı vardır; formda
        // boş gösterip yanlışlıkla silinmesine yol açmamak için doldurulur.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const existingName = (user?.user_metadata?.full_name as string) ?? "";
        if (existingName) {
          setFullName(existingName);
        }
        setStatus("ready");
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const name = fullName.trim();

    const { error } = await supabase.auth.updateUser({
      password,
      data: { full_name: name },
    });

    if (error) {
      setError("Şifre belirlenemedi: " + error.message);
      setPending(false);
      return;
    }

    // Davetle gelen kullanıcının profiles satırı boş full_name ile açılır
    // (handle_new_user davette isim alamaz); ilk girişte burada doldurulur.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", user.id);
    }

    window.location.href = "/";
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      </main>
    );
  }

  if (status === "invalid") {
    return (
      <main className="flex min-h-full flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Davet bağlantısı geçersiz veya süresi dolmuş. Yöneticinizden yeni
          bir davet isteyin.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="space-y-2 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
            G
          </span>
          <h1 className="text-xl font-semibold">Şifre Belirleyin</h1>
          <p className="text-sm text-muted-foreground">
            Hesabınıza giriş yapmak için bir şifre belirleyin
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="full_name" className="text-sm font-medium">
            Adınız Soyadınız
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            autoComplete="name"
            placeholder="ör. Yasin Dikdere"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Yeni şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Kaydediliyor…" : "Şifreyi Kaydet ve Devam Et"}
        </button>
      </form>
    </main>
  );
}
