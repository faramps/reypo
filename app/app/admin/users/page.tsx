import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRoleRow, type UserRow } from "@/components/admin/user-role-row";

export default async function UsersPage() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    {
      data: { user: currentUser },
    },
    { data: authUsers },
    { data: profiles },
    { data: roles },
  ] = await Promise.all([
    supabase.auth.getUser(),
    adminClient.auth.admin.listUsers(),
    supabase.from("profiles").select("id, full_name, system_role, role_id"),
    supabase.from("roles").select("id, name").order("created_at"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows: UserRow[] = (authUsers?.users ?? []).map((u) => {
    const profile = profileById.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      fullName: profile?.full_name ?? "",
      systemRole: profile?.system_role ?? "member",
      roleId: profile?.role_id ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Kullanıcılar</h1>
      <CreateUserForm roles={roles ?? []} />
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Kullanıcı</th>
              <th className="px-4 py-2 font-medium">İş Rolü</th>
              <th className="px-4 py-2 font-medium">Yetki</th>
              <th className="px-4 py-2 font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <UserRoleRow
                key={row.id}
                user={row}
                roles={roles ?? []}
                currentUserId={currentUser?.id ?? ""}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-muted-foreground">
                  Henüz kullanıcı yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
