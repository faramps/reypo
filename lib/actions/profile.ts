"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error?: string; success?: string } | undefined;

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Oturum açılmamış." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { error: "Ad Soyad boş olamaz." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    return { error: "Profil güncellenemedi." };
  }

  // İsim sidebar'da (layout seviyesinde) gösterildiği için layout revalidate edilir.
  revalidatePath("/app", "layout");
  return { success: "Profil kaydedildi." };
}
