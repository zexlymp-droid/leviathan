const HELIUS_API_BASE = "https://api.helius.xyz/v0/webhooks";

type WebhookConfig = {
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: "enhanced";
  authHeader?: string;
};

export async function upsertHeliusWebhook(
  addresses: string[],
  existingWebhookId: string | null
): Promise<string> {
  const apiKey = process.env.HELIUS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL; // e.g. https://leviathan.vercel.app
  const secret = process.env.WEBHOOK_SHARED_SECRET;

  if (!apiKey) throw new Error("HELIUS_API_KEY belum diset.");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL belum diset.");

  const body: WebhookConfig = {
    webhookURL: `${appUrl}/api/webhook/helius`,
    transactionTypes: ["SWAP"],
    accountAddresses: addresses,
    webhookType: "enhanced",
    authHeader: secret,
  };

  if (addresses.length === 0) {
    // Nothing to watch — if a webhook exists, we still keep it registered with
    // an empty list rather than deleting, to avoid churn; Helius simply won't
    // fire events for an empty address list.
  }

  const url = existingWebhookId
    ? `${HELIUS_API_BASE}/${existingWebhookId}?api-key=${apiKey}`
    : `${HELIUS_API_BASE}?api-key=${apiKey}`;

  const res = await fetch(url, {
    method: existingWebhookId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Helius webhook sync gagal: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.webhookID ?? existingWebhookId;
}
