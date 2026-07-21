import { NextRequest, NextResponse } from "next/server";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export async function POST(req: NextRequest) {
  try {
    const { userPublicKey, tokenMint, amountSol, direction } = await req.json();

    if (!userPublicKey || !tokenMint || !amountSol || !direction) {
      return NextResponse.json(
        { error: "userPublicKey, tokenMint, amountSol, dan direction wajib diisi." },
        { status: 400 }
      );
    }

    const inputMint = direction === "buy" ? SOL_MINT : tokenMint;
    const outputMint = direction === "buy" ? tokenMint : SOL_MINT;
    const amountLamports = Math.round(amountSol * 1e9);

    const quoteRes = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=100`
    );
    if (!quoteRes.ok) {
      return NextResponse.json(
        { error: "Gagal mendapat quote dari Jupiter. Cek alamat token atau likuiditas." },
        { status: 502 }
      );
    }
    const quote = await quoteRes.json();

    const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
      }),
    });
    if (!swapRes.ok) {
      return NextResponse.json(
        { error: "Gagal menyiapkan transaksi swap." },
        { status: 502 }
      );
    }
    const swapData = await swapRes.json();

    return NextResponse.json({
      swapTransaction: swapData.swapTransaction, // base64, belum ditandatangani
      quote: {
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpactPct: quote.priceImpactPct,
      },
    });
  } catch (err) {
    console.error("Copy trade prep error:", err);
    return NextResponse.json({ error: "Gagal menyiapkan copy trade." }, { status: 500 });
  }
}
