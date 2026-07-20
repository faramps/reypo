"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    undefined
  );

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/40 p-6">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <div className="space-y-2 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-base font-bold text-white">
            G
          </span>
          <h1 className="text-xl font-semibold">Görev Takip</h1>
          <p className="text-sm text-muted-foreground">
            Hesabınızla giriş yapın
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Şifrenizi unuttuysanız veya hesabınız yoksa yöneticinize başvurun.
        </p>
      </form>
    </main>
  );
}
