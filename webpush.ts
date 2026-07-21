import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys belum diset di environment variables.");
  }

  webpush.setVapidDetails("mailto:admin@leviathan.app", publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionData = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: { title: string; body: string; url?: string }
) {
  ensureConfigured();
  try {
    await webpush.sendNotification(subscription as any, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    // 410/404 means the subscription is no longer valid (user revoked, browser data cleared)
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return false;
    }
    throw err;
  }
}
