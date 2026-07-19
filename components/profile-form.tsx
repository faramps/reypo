"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";

export function ProfileForm({ initialFullName }: { initialFullName: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined
  );

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <label htmlFor="full_name" className="text-sm font-medium">
          Ad Soyad
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          defaultValue={initialFullName}
          autoComplete="name"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-destructive">{state.error}</p>
      )}
      {state?.success && (
        <p className="w-full text-sm text-emerald-600">{state.success}</p>
      )}
    </form>
  );
}
