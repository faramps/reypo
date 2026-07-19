"use client";

import { useTransition } from "react";
import { updateUserRole, updateSystemRole } from "@/lib/actions/users";
import { DeleteUserButton } from "./delete-user-button";
import { ResetPasswordButton } from "./reset-password-button";
import type { SystemRole } from "@/lib/supabase/types";

export type UserRow = {
  id: string;
  email: string;
  fullName: string;
  systemRole: SystemRole;
  roleId: string | null;
};

export function UserRoleRow({
  user,
  roles,
  currentUserId,
}: {
  user: UserRow;
  roles: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr>
      <td className="px-4 py-2">
        <div className="font-medium">{user.fullName || user.email}</div>
        {user.fullName && (
          <div className="text-xs text-muted-foreground">{user.email}</div>
        )}
      </td>
      <td className="px-4 py-2">
        <select
          defaultValue={user.roleId ?? ""}
          disabled={isPending}
          onChange={(e) => {
            const value = e.target.value || null;
            startTransition(() => updateUserRole(user.id, value));
          }}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
        >
          <option value="">— Yok —</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-2">
        <select
          defaultValue={user.systemRole}
          disabled={isPending || user.id === currentUserId}
          title={
            user.id === currentUserId
              ? "Kendi yetkinizi değiştiremezsiniz"
              : undefined
          }
          onChange={(e) =>
            startTransition(() =>
              updateSystemRole(user.id, e.target.value as SystemRole)
            )
          }
          className="rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
        >
          <option value="member">Üye</option>
          <option value="admin">Yönetici</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col items-start gap-1">
          <ResetPasswordButton userId={user.id} />
          {user.id !== currentUserId && (
            <DeleteUserButton userId={user.id} email={user.email} />
          )}
        </div>
      </td>
    </tr>
  );
}
