const SOL_MINT = "So11111111111111111111111111111111111111112";

export type PriceInfo = {
  priceUsd: number;
  pairAddress: string;
  dexId: string;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  tokenSymbol: string;
};

// DexScreener — free, no API key required.
export async function getDexScreenerPrice(mint: string): Promise<PriceInfo | null> {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
  if (!res.ok) throw new Error("DexScreener request failed");
  const data = await res.json();
  const pairs = data.pairs ?? [];
  if (pairs.length === 0) return null;

  // Pick the pair with the highest liquidity — most reliable price source
  const best = [...pairs].sort(
    (a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  )[0];

  return {
    priceUsd: parseFloat(best.priceUsd),
    pairAddress: best.pairAddress,
    dexId: best.dexId,
    liquidityUsd: best.liquidity?.usd ?? null,
    volume24hUsd: best.volume?.h24 ?? null,
    tokenSymbol: best.baseToken?.symbol ?? "UNKNOWN",
  };
}

export async function getSolPriceUsd(): Promise<number | null> {
  const priceInfo = await getDexScreenerPrice(SOL_MINT);
  return priceInfo?.priceUsd ?? null;
}

export type TrendingToken = {
  mint: string;
  symbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
};

// DexScreener's official "boosted tokens" endpoint — free, no API key.
// This reflects tokens currently being promoted/boosted, which is the closest
// free, documented signal to "trending" without needing a paid API.
export async function getTrendingSolanaTokens(limit = 10): Promise<TrendingToken[]> {
  const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1");
  if (!res.ok) throw new Error("Gagal mengambil daftar token trending.");
  const boosts = await res.json();

  const solanaMints: string[] = boosts
    .filter((b: any) => b.chainId === "solana")
    .map((b: any) => b.tokenAddress)
    .slice(0, limit);

  const results: TrendingToken[] = [];
  for (const mint of solanaMints) {
    try {
      const priceInfo = await getDexScreenerPrice(mint);
      if (priceInfo) {
        results.push({
          mint,
          symbol: priceInfo.tokenSymbol,
          priceUsd: priceInfo.priceUsd,
          liquidityUsd: priceInfo.liquidityUsd,
          volume24hUsd: priceInfo.volume24hUsd,
        });
      }
    } catch {
      // Skip tokens that fail to resolve — don't let one bad token break the whole list
      continue;
    }
  }
  return results;
}

export type HeliusTransfer = {
  mint?: string;
  tokenAmount?: number;
  fromUserAccount?: string;
  toUserAccount?: string;
};

export type HeliusSwapTx = {
  signature: string;
  timestamp: number;
  feePayer: string;
  tokenTransfers: HeliusTransfer[];
  nativeTransfers: { amount: number; fromUserAccount: string; toUserAccount: string }[];
};

// Helius Enhanced Transactions API — free tier, requires HELIUS_API_KEY.
// Fetches recent SWAP transactions that touched the given pool address.
export async function getPoolSwaps(
  pairAddress: string,
  limit = 50
): Promise<HeliusSwapTx[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) throw new Error("HELIUS_API_KEY belum diset.");

  const url = `https://api.helius.xyz/v0/addresses/${pairAddress}/transactions?api-key=${apiKey}&type=SWAP&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Helius request failed: ${res.status}`);
  return res.json();
}
