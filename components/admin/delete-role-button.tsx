"use client";

import { useTransition } from "react";
import { deleteRole } from "@/lib/actions/roles";

export function DeleteRoleButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `"${name}" rolü silinecek; bu roldeki kullanıcılar ve görevler rolsüz kalır. Emin misiniz?`
      )
    ) {
      return;
    }
    startTransition(() => deleteRole(id));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-sm text-destructive underline underline-offset-2 disabled:opacity-50"
    >
      Sil
    </button>
  );
}
