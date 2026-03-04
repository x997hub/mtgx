import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

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

export function usePush() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );
  const user = useAuthStore((s) => s.user);

  const subscribeToPush = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys) return;

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh!,
          auth: subJson.keys.auth!,
        },
        { onConflict: "endpoint" }
      );

      if (error) {
        console.error("Failed to save push subscription:", error);
      }
    } catch (err) {
      console.error("Failed to subscribe to push notifications:", err);
    }
  }, [user]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied" as const;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        await subscribeToPush();
      }

      return result;
    } catch (err) {
      console.error("Failed to request notification permission:", err);
      return "denied" as const;
    }
  }, [subscribeToPush]);

  return {
    permission,
    requestPermission,
    isSupported: "Notification" in window && "serviceWorker" in navigator,
  };
}
