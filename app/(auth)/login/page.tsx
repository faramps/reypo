import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Zaten girişli kullanıcıya login formu göstermenin anlamı yok.
  if (user) {
    redirect("/app");
  }

  return <LoginForm />;
}
