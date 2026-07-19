"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "@/lib/actions/users";

export function DeleteUserButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(`${email} hesabını silmek istediğinize emin misiniz?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteUser(userId);
      setError(result?.error ?? null);
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-destructive underline underline-offset-2 disabled:opacity-50"
      >
        Sil
      </button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
