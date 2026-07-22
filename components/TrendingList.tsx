"use client";

import { useEffect, useState } from "react";

type TrendingToken = {
  mint: string;
  symbol: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
};

export default function TrendingList({ onSelect }: { onSelect: (mint: string) => void }) {
  const [tokens, setTokens] = useState<TrendingToken[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trending")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTokens(data.tokens);
      })
      .catch(() => setError("Gagal memuat token trending."));
  }, []);

  if (error) return <p className="text-xs text-alert mb-6">{error}</p>;

  if (!tokens) {
    return (
      <div className="space-y-2 mb-6 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-surface border border-border rounded" />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return <p className="text-xs text-muted mb-6 italic">Tidak ada token trending saat ini.</p>;
  }

  return (
    <div className="mb-6">
      <p className="text-xs font-mono text-signal mb-2">TRENDING — klik untuk scan langsung</p>
      <div className="space-y-1.5">
        {tokens.map((t) => (
          <button
            key={t.mint}
            onClick={() => onSelect(t.mint)}
            className="w-full flex items-center justify-between border border-border rounded-lg bg-surface px-4 py-2.5 hover:border-signal/50 transition-colors text-left"
          >
            <span className="font-mono text-sm text-foam">{t.symbol}</span>
            <div className="flex items-center gap-3 text-xs text-muted font-mono">
              {t.priceUsd !== null && <span>${t.priceUsd < 0.01 ? t.priceUsd.toExponential(2) : t.priceUsd.toFixed(4)}</span>}
              {t.volume24hUsd !== null && (
                <span>vol ${Math.round(t.volume24hUsd).toLocaleString("id-ID")}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
