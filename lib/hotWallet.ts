import { Keypair, Connection } from "@solana/web3.js";
import bs58 from "bs58";

let cachedKeypair: Keypair | null = null;

export function getHotWalletKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;
  const secret = process.env.HOT_WALLET_PRIVATE_KEY;
  if (!secret) {
    throw new Error(
      "HOT_WALLET_PRIVATE_KEY belum diset. Auto-trade tidak bisa jalan tanpa ini."
    );
  }
  cachedKeypair = Keypair.fromSecretKey(bs58.decode(secret));
  return cachedKeypair;
}

export function getHotWalletPublicKey(): string {
  return getHotWalletKeypair().publicKey.toBase58();
}

export async function getHotWalletBalanceSol(connection: Connection): Promise<number> {
  const pubkey = getHotWalletKeypair().publicKey;
  const lamports = await connection.getBalance(pubkey);
  return lamports / 1e9;
}
