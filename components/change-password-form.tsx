"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== passwordRepeat) {
      setError("Şifreler eşleşmiyor.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Şifre güncellenemedi: " + error.message);
      setPending(false);
      return;
    }

    setSuccess(true);
    setPassword("");
    setPasswordRepeat("");
    setPending(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="new_password" className="text-sm font-medium">
            Yeni şifre
          </label>
          <input
            id="new_password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="new_password_repeat" className="text-sm font-medium">
            Yeni şifre (tekrar)
          </label>
          <input
            id="new_password_repeat"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={passwordRepeat}
            onChange={(e) => setPasswordRepeat(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-600">Şifreniz güncellendi.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Güncelleniyor…" : "Şifreyi Değiştir"}
      </button>
    </form>
  );
}
