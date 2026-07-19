"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/actions/push";

function subscribeNoop() {
  return () => {};
}

function getIsPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

function getServerSnapshot() {
  return false;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionManager() {
  const isSupported = useSyncExternalStore(
    subscribeNoop,
    getIsPushSupported,
    getServerSnapshot
  );
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported) return;
    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await registration.pushManager.getSubscription();
        if (!cancelled) {
          setSubscription(sub);
        }
      } catch {
        // Dev'de StrictMode/Fast Refresh bileşeni hızla söküp yeniden taktığında
        // devam eden kayıt AbortError ile iptal olur — zararsızdır; effect
        // yeniden çalıştığında veya kullanıcı "Bildirimleri Aç"a bastığında
        // kayıt zaten tekrar denenir. Yakalanmazsa unhandledRejection basar.
      }
    }

    registerServiceWorker();
    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  async function subscribe() {
    setPending(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });
      setSubscription(sub);
      const json = sub.toJSON();
      await subscribeToPush({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
      });
    } catch {
      setError("Bildirim izni verilmedi veya bir hata oluştu.");
    } finally {
      setPending(false);
    }
  }

  async function unsubscribe() {
    if (!subscription) return;
    setPending(true);
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    setSubscription(null);
    await unsubscribeFromPush(endpoint);
    setPending(false);
  }

  if (!isSupported) {
    return (
      <p className="text-sm text-muted-foreground">
        Bu tarayıcı push bildirimlerini desteklemiyor. iPhone&apos;da bu
        özellik yalnızca uygulama ana ekrana eklendiğinde çalışır.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {subscription ? (
        <>
          <p className="text-sm text-muted-foreground">Bildirimler açık.</p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={pending}
            className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-50"
          >
            Bildirimleri Kapat
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Size görev atandığında bildirim almak için açın.
          </p>
          <button
            type="button"
            onClick={subscribe}
            disabled={pending}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {pending ? "Açılıyor…" : "Bildirimleri Aç"}
          </button>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
