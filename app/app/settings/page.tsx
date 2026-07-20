import { redirect } from "next/navigation";
import { Bell, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/current-profile";
import { ProfileForm } from "@/components/profile-form";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PushSubscriptionManager } from "@/components/push-subscription-manager";
import { InstallPrompt } from "@/components/install-prompt";

function SectionTitle({
  icon: Icon,
  chip,
  children,
}: {
  icon: typeof UserRound;
  chip: string;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-medium">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${chip}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </h2>
  );
}

export default async function SettingsPage() {
  const { user, profile } = await getCurrentProfile();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Ayarlar</h1>

      <section className="space-y-2">
        <SectionTitle icon={UserRound} chip="bg-indigo-100 text-indigo-700">
          Profil
        </SectionTitle>
        <ProfileForm initialFullName={profile?.full_name ?? ""} />
      </section>

      <section className="space-y-2">
        <SectionTitle icon={ShieldCheck} chip="bg-emerald-100 text-emerald-700">
          Güvenlik
        </SectionTitle>
        <ChangePasswordForm />
      </section>

      <section className="space-y-2">
        <SectionTitle icon={Bell} chip="bg-amber-100 text-amber-800">
          Bildirimler
        </SectionTitle>
        <PushSubscriptionManager />
      </section>

      <section className="space-y-2">
        <SectionTitle icon={Smartphone} chip="bg-sky-100 text-sky-700">
          Uygulama
        </SectionTitle>
        <InstallPrompt />
      </section>
    </div>
  );
}
