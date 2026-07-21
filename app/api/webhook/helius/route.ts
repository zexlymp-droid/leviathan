import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendPushNotification } from "@/lib/webpush";
import { getSolPriceUsd } from "@/lib/solana";
import { executeAutoTrade, AutoTradeBlockedError } from "@/lib/autoTrade";

export async function POST(req: NextRequest) {
  try {
    // Verify this request actually came from Helius, not a random caller
    const secret = process.env.WEBHOOK_SHARED_SECRET;
    const authHeader = req.headers.get("authorization");
    if (secret && authHeader !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await req.json();
    const db = getAdminDb();

    const whalesSnap = await db.collection("whales").get();
    const whaleMap = new Map(
      whalesSnap.docs.map((d) => [
        d.data().address as string,
        {
          label: d.data().label as string,
          copyAmountSol: (d.data().copyAmountSol as number) ?? 0,
          autoApprove: (d.data().autoApprove as boolean) ?? false,
        },
      ])
    );

    const solPrice = await getSolPriceUsd();

    for (const event of Array.isArray(events) ? events : [events]) {
      const feePayer: string | undefined = event.feePayer;
      if (!feePayer || !whaleMap.has(feePayer)) continue;

      const whaleConfig = whaleMap.get(feePayer)!;
      const tokenTransfer = event.tokenTransfers?.[0];
      const nativeTransfer = event.nativeTransfers?.[0];
      if (!tokenTransfer) continue;

      const isBuy = tokenTransfer.toUserAccount === feePayer;
      const direction: "buy" | "sell" = isBuy ? "buy" : "sell";
      const solAmount = nativeTransfer ? nativeTransfer.amount / 1e9 : null;
      const usdValue = solAmount && solPrice ? Math.round(solAmount * solPrice) : null;

      let title = `${whaleConfig.label} ${isBuy ? "membeli" : "menjual"} ${tokenTransfer.mint?.slice(0, 6)}…`;
      let body = usdValue
        ? `Nilai transaksi: ~$${usdValue.toLocaleString("id-ID")}`
        : "Transaksi terdeteksi — cek detail di web.";

      // Auto-approve path: execute for real, through every safety gate
      if (whaleConfig.autoApprove && whaleConfig.copyAmountSol > 0) {
        try {
          const result = await executeAutoTrade(
            tokenTransfer.mint,
            whaleConfig.copyAmountSol,
            direction
          );
          body = `Auto-copy terkirim: ${result.amountUsed} SOL. Tx: ${result.signature.slice(0, 8)}…`;
        } catch (err) {
          if (err instanceof AutoTradeBlockedError) {
            body = `Auto-copy DIBLOKIR: ${err.message}`;
          } else {
            console.error("Auto-trade execution error:", err);
            body = "Auto-copy gagal — cek log server.";
          }
        }
      }

      const subsSnap = await db.collection("pushSubscriptions").get();
      for (const subDoc of subsSnap.docs) {
        const sub = subDoc.data();
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          { title, body, url: "/" }
        );
        if (!ok) {
          await subDoc.ref.delete(); // subscription no longer valid, clean it up
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Helius webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
