import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { InstallPrompt } from "@/components/install-prompt";

export default async function SettingsPage() {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Ayarlar</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Profil</h2>
        <ProfileForm initialFullName={profile?.full_name ?? ""} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Güvenlik</h2>
        <ChangePasswordForm />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Bildirimler</h2>
        <PushSubscriptionManager />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Uygulama</h2>
        <InstallPrompt />
      </section>
    </div>
  );
}
