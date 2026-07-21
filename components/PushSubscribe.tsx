"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushSubscribe() {
  const [status, setStatus] = useState<"idle" | "subscribed" | "denied" | "unsupported">(
    "idle"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") {
      // Already granted before — check if we still have an active subscription
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) setStatus("subscribed");
      });
    } else if (Notification.permission === "denied") {
      setStatus("denied");
    }
  }, []);

  async function handleSubscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID public key belum diset.");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const subJson = sub.toJSON();
      const subId = btoa(subJson.endpoint || "").slice(0, 40);

      await setDoc(doc(db, "pushSubscriptions", subId), {
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        createdAt: Date.now(),
      });

      setStatus("subscribed");
    } catch (err) {
      console.error("Push subscribe error:", err);
      setStatus("denied");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs text-muted">
        Browser ini tidak mendukung push notification.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-2 text-xs text-signal font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-signal" />
        Notifikasi aktif
      </div>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      className="text-xs font-mono text-abyss bg-signal hover:bg-signal/90 rounded px-3 py-1.5 transition-colors"
    >
      {status === "denied" ? "Notifikasi diblokir — cek setting browser" : "Aktifkan Notifikasi"}
    </button>
  );
}
