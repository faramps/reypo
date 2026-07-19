"use server";

import { createClient } from "@/lib/supabase/server";

type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function subscribeToPush(subscription: PushSubscriptionJSON) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Oturum açılmamış.");
  }

  await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient();
  // RLS (push_subscriptions_delete_own) zaten user_id = auth.uid() dışındaki
  // satırları korur; endpoint eşleşse bile başkasının aboneliği silinemez.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
