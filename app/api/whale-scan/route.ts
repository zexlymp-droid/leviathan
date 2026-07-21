import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getDexScreenerPrice, getSolPriceUsd, getPoolSwaps } from "@/lib/solana";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const WHALE_THRESHOLD_USD = 100_000;

// Simple in-memory rate limiter, same pattern as /api/enhance.
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(ip);
  if (!entry || now > entry.resetAt) {
    requestLog.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

const SYSTEM_PROMPT = `Kamu adalah analis on-chain yang menerima DATA MENTAH yang sudah dihitung oleh sistem — kamu TIDAK mengumpulkan atau menghitung data sendiri, dan TIDAK PERNAH mengubah atau menciptakan angka yang tidak ada di data yang diberikan.

Tugasmu HANYA: (1) menilai tingkat keyakinan (confidence) tiap temuan berdasarkan kualitas datanya, (2) menulis alasan_analisis yang menjelaskan temuan dalam bahasa natural, (3) merapikan ke format JSON yang diminta.

Aturan confidence:
- Data mengandung catatan bahwa harga eksekusi adalah ESTIMASI (bukan harga historis pasti) → confidence MAKSIMAL "sedang", tidak boleh "tinggi", karena dasarnya adalah pendekatan bukan data pasti.
- Kalau nilai transaksi besar tapi profit_estimate_percent tidak tersedia/null → confidence "rendah", jelaskan keterbatasannya.

Jika whale_transactions_found kosong atau tidak ada, kembalikan alerts: [] dan recommendations: [] — JANGAN mengarang entri supaya array tidak kosong.

Untuk recommendations, HANYA buat entri untuk whale transaction dengan profit_estimate_percent >= 20 DAN ada data harga saat ini yang valid. entry_price = execution_price_approx dari data, target_price dan stop_loss_price HARUS kamu turunkan secara wajar dari current_price_usd dan volatilitas yang tersirat dari data (jangan mengarang angka acak) — dan sertakan alasan_analisis yang menjelaskan basis perhitungannya. Selalu sertakan disclaimer bahwa ini bukan jaminan profit.

Kembalikan HANYA JSON valid, tanpa markdown, tanpa teks lain, dengan struktur persis:
{
  "alerts": [{"token": "", "whale_address": "", "transaction_hash": "", "timestamp": "", "transaction_value_usd": 0, "profit_estimate_percent": 0, "confidence": "sedang/rendah", "alasan_analisis": ""}],
  "recommendations": [{"token": "", "entry_price": 0, "target_price": 0, "stop_loss_price": 0, "confidence": "sedang/rendah", "alasan_analisis": "", "disclaimer": "Bukan jaminan profit — estimasi berbasis data on-chain historis, bukan prediksi pasti"}]
}`;

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam beberapa saat." },
        { status: 429 }
      );
    }

    const { mint } = await req.json();
    if (!mint || typeof mint !== "string") {
      return NextResponse.json(
        { error: "Alamat token (mint address) wajib diisi." },
        { status: 400 }
      );
    }

    // 1. Harga & pool dari DexScreener (data nyata, bukan dari AI)
    const priceInfo = await getDexScreenerPrice(mint.trim());
    if (!priceInfo) {
      return NextResponse.json(
        { error: "Token tidak ditemukan di DexScreener. Cek alamat mint-nya." },
        { status: 404 }
      );
    }

    const solPrice = await getSolPriceUsd();
    if (!solPrice) {
      return NextResponse.json(
        { error: "Gagal mengambil harga SOL untuk kalkulasi." },
        { status: 502 }
      );
    }

    // 2. Transaksi swap di pool dari Helius (data nyata)
    const swaps = await getPoolSwaps(priceInfo.pairAddress, 50);

    // 3. Hitung nilai & estimasi profit — DETERMINISTIK, bukan AI
    const analyzed = swaps
      .map((tx) => {
        const tokenTransfer = tx.tokenTransfers?.find((t) => t.mint === mint);
        const solTransfer = tx.nativeTransfers?.[0];
        if (!tokenTransfer?.tokenAmount || !solTransfer?.amount) return null;

        const solAmount = solTransfer.amount / 1e9;
        const usdValue = solAmount * solPrice;
        const executionPriceApprox =
          tokenTransfer.tokenAmount > 0 ? usdValue / tokenTransfer.tokenAmount : null;
        const profitEstimatePercent = executionPriceApprox
          ? Math.round(
              ((priceInfo.priceUsd - executionPriceApprox) / executionPriceApprox) * 1000
            ) / 10
          : null;

        return {
          transaction_hash: tx.signature,
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          whale_address: tx.feePayer,
          transaction_value_usd: Math.round(usdValue),
          execution_price_approx: executionPriceApprox,
          profit_estimate_percent: profitEstimatePercent,
        };
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null)
      .filter((tx) => tx.transaction_value_usd >= WHALE_THRESHOLD_USD);

    // 4. Data terkurasi dikirim ke AI hanya untuk narasi + confidence, bukan angka baru
    const dataForModel = {
      token: priceInfo.tokenSymbol,
      token_mint: mint,
      current_price_usd: priceInfo.priceUsd,
      liquidity_usd: priceInfo.liquidityUsd,
      dex: priceInfo.dexId,
      whale_transactions_found: analyzed,
      catatan:
        "execution_price_approx dihitung dari rasio SOL/token dalam transaksi dikali harga SOL saat ini — BUKAN harga historis pasti, melainkan pendekatan karena keterbatasan API gratis.",
    };

    if (analyzed.length === 0) {
      return NextResponse.json({ alerts: [], recommendations: [] });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(dataForModel) },
      ],
      temperature: 0.15,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Gagal memproses hasil dari model." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Whale scan error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil atau memproses data on-chain." },
      { status: 500 }
    );
  }
}
