"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "@/lib/actions/users";

export function CreateUserForm({
  roles,
}: {
  roles: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(
    createUser,
    undefined
  );

  return (
    <div className="space-y-3">
      <form
        action={formAction}
        className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
      >
        <p className="text-sm font-medium">Yeni Kullanıcı Oluştur</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="full_name" className="text-sm font-medium">
              Ad Soyad
            </label>
            <input
              id="full_name"
              name="full_name"
              required
              placeholder="ör. Ahmet Yılmaz"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
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
              placeholder="ornek@sirket.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="role_id" className="text-sm font-medium">
            İş rolü (opsiyonel)
          </label>
          <select
            id="role_id"
            name="role_id"
            defaultValue=""
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:w-1/2"
          >
            <option value="">— Yok —</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Oluşturuluyor…" : "Kullanıcı Oluştur"}
        </button>
      </form>

      {state?.password && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-medium text-emerald-800">Kullanıcı oluşturuldu.</p>
          <p className="mt-1 text-emerald-700">
            <span className="font-medium">{state.createdEmail}</span> için geçici
            şifre:
          </p>
          <p className="mt-2 select-all rounded-md bg-white px-3 py-2 font-mono text-base text-emerald-900">
            {state.password}
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            Bu şifreyi kişiye iletin (tekrar gösterilmeyecek). Kişi giriş yapıp
            Ayarlar &gt; Güvenlik&apos;ten kendi şifresini belirleyebilir.
          </p>
        </div>
      )}
    </div>
  );
}
