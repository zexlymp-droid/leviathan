import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getSafetyConfig } from "@/lib/autoTrade";
import { getHotWalletPublicKey, getHotWalletBalanceSol } from "@/lib/hotWallet";
import { Connection } from "@solana/web3.js";

export async function GET() {
  try {
    const safety = await getSafetyConfig();

    let hotWalletAddress: string | null = null;
    let hotWalletBalance: number | null = null;
    try {
      hotWalletAddress = getHotWalletPublicKey();
      const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      hotWalletBalance = await getHotWalletBalanceSol(connection);
    } catch {
      // Hot wallet not configured yet — fine, just report null
    }

    return NextResponse.json({ safety, hotWalletAddress, hotWalletBalance });
  } catch (err) {
    console.error("GET /safety error:", err);
    return NextResponse.json({ error: "Gagal memuat konfigurasi safety." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getAdminDb();

    const allowedFields = ["killSwitch", "maxPerTradeSol", "dailyLimitSol"];
    const update: Record<string, any> = {};
    for (const field of allowedFields) {
      if (field in body) update[field] = body[field];
    }

    await db.collection("config").doc("safety").set(update, { merge: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /safety error:", err);
    return NextResponse.json({ error: "Gagal update safety config." }, { status: 500 });
  }
}
