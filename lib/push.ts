import "server-only";
import webpush, { WebPushError } from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; taskId?: string }
) {
  const adminClient = createAdminClient();
  const { data: subscriptions } = await adminClient
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (error) {
        // 404/410 = abonelik artık geçersiz (tarayıcı/cihaz silinmiş); tabloyu temizle.
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("id", staleIds);
  }
}
