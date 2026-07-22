import { NextResponse } from "next/server";
import { getTrendingSolanaTokens } from "@/lib/solana";

export async function GET() {
  try {
    const tokens = await getTrendingSolanaTokens(10);
    return NextResponse.json({ tokens });
  } catch (err) {
    console.error("GET /trending error:", err);
    return NextResponse.json({ error: "Gagal mengambil token trending." }, { status: 500 });
  }
}
