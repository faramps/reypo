"use client";

import { useState, useTransition } from "react";
import { resetUserPassword } from "@/lib/actions/users";

export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (
      !window.confirm(
        "Bu kullanıcıya yeni bir geçici şifre üretilecek; eski şifresi geçersiz olur. Devam edilsin mi?"
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await resetUserPassword(userId);
      if (result.error) {
        setError(result.error);
        setPassword(null);
      } else {
        setPassword(result.password ?? null);
        setError(null);
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm underline underline-offset-2 disabled:opacity-50"
      >
        Şifre Sıfırla
      </button>
      {password && (
        <p className="mt-1 select-all font-mono text-xs text-emerald-700">
          {password}
        </p>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
