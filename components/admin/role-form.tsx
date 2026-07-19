"use client";

import { useActionState } from "react";
import { createRole, type RoleState } from "@/lib/actions/roles";

export function RoleForm() {
  const [state, formAction, pending] = useActionState<RoleState, FormData>(
    createRole,
    undefined
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Rol adı
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="ör. Yazılımcı"
          className="rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="color" className="text-sm font-medium">
          Renk
        </label>
        <input
          id="color"
          name="color"
          type="color"
          defaultValue="#3b82f6"
          className="h-10 w-14 rounded-md border border-input bg-background p-1"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Ekleniyor…" : "Rol Ekle"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
