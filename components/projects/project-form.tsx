"use client";

import { useActionState } from "react";
import { createProject, type ProjectState } from "@/lib/actions/projects";

export function ProjectForm() {
  const [state, formAction, pending] = useActionState<ProjectState, FormData>(
    createProject,
    undefined
  );

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Proje adı
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="description" className="text-sm font-medium">
          Açıklama
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Oluşturuluyor…" : "Proje Oluştur"}
      </button>
    </form>
  );
}
