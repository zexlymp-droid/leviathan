import { Connection, VersionedTransaction } from "@solana/web3.js";
import { getHotWalletKeypair } from "./hotWallet";
import { getAdminDb } from "./firebaseAdmin";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const DAY_MS = 24 * 60 * 60 * 1000;

export class AutoTradeBlockedError extends Error {}

type SafetyConfig = {
  killSwitch: boolean;
  maxPerTradeSol: number;
  dailyLimitSol: number;
  dailyUsedSol: number;
  dailyResetAt: number;
};

const SAFE_DEFAULTS: SafetyConfig = {
  killSwitch: true, // OFF by default — must be explicitly enabled by the user
  maxPerTradeSol: 0.05,
  dailyLimitSol: 0.2,
  dailyUsedSol: 0,
  dailyResetAt: 0,
};

export async function getSafetyConfig(): Promise<SafetyConfig> {
  const db = getAdminDb();
  const doc = await db.collection("config").doc("safety").get();
  return doc.exists ? { ...SAFE_DEFAULTS, ...doc.data() } : SAFE_DEFAULTS;
}

export async function executeAutoTrade(
  tokenMint: string,
  requestedAmountSol: number,
  direction: "buy" | "sell"
): Promise<{ signature: string; amountUsed: number }> {
  const db = getAdminDb();
  const safety = await getSafetyConfig();

  // Gate 1: kill switch
  if (safety.killSwitch) {
    throw new AutoTradeBlockedError("Kill switch aktif — auto-trade dimatikan.");
  }

  // Gate 2: hard per-trade cap, regardless of what's configured per whale
  const amountSol = Math.min(requestedAmountSol, safety.maxPerTradeSol);
  if (amountSol <= 0) {
    throw new AutoTradeBlockedError("Nominal trade tidak valid.");
  }

  // Gate 3: daily cap, resets every 24h from first use
  const now = Date.now();
  const dailyExpired = !safety.dailyResetAt || now - safety.dailyResetAt > DAY_MS;
  const dailyUsedSoFar = dailyExpired ? 0 : safety.dailyUsedSol;
  if (dailyUsedSoFar + amountSol > safety.dailyLimitSol) {
    throw new AutoTradeBlockedError("Limit harian auto-trade sudah tercapai.");
  }

  const keypair = getHotWalletKeypair();
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  // Gate 4: actually have the balance (never trade more than what's really there)
  const balanceLamports = await connection.getBalance(keypair.publicKey);
  const balanceSol = balanceLamports / 1e9;
  if (direction === "buy" && balanceSol < amountSol + 0.01) {
    throw new AutoTradeBlockedError("Saldo hot wallet tidak cukup untuk trade ini.");
  }

  const inputMint = direction === "buy" ? SOL_MINT : tokenMint;
  const outputMint = direction === "buy" ? tokenMint : SOL_MINT;
  const amountLamports = Math.round(amountSol * 1e9);

  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=150`
  );
  if (!quoteRes.ok) throw new Error("Gagal ambil quote dari Jupiter.");
  const quote = await quoteRes.json();

  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
    }),
  });
  if (!swapRes.ok) throw new Error("Gagal menyiapkan transaksi swap.");
  const swapData = await swapRes.json();

  const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(txBuffer);
  transaction.sign([keypair]);

  const signature = await connection.sendTransaction(transaction);
  await connection.confirmTransaction(signature, "confirmed");

  // Record usage against the daily cap
  await db.collection("config").doc("safety").set(
    {
      ...safety,
      dailyUsedSol: dailyUsedSoFar + amountSol,
      dailyResetAt: dailyExpired ? now : safety.dailyResetAt,
    },
    { merge: true }
  );

  return { signature, amountUsed: amountSol };
}
