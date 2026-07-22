"use client";

import { useState } from "react";
import TrendingList from "./TrendingList";

type Alert = {
  token: string;
  whale_address: string;
  transaction_hash: string;
  timestamp: string;
  transaction_value_usd: number;
  profit_estimate_percent: number;
  confidence: string;
  alasan_analisis: string;
};

type Recommendation = {
  token: string;
  entry_price: number;
  target_price: number;
  stop_loss_price: number;
  confidence: string;
  alasan_analisis: string;
  disclaimer: string;
};

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WhaleScan() {
  const [mint, setMint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  async function handleScan() {
    if (!mint.trim()) return;
    setLoading(true);
    setError(null);
    setAlerts(null);
    setRecommendations(null);

    try {
      const res = await fetch("/api/whale-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint: mint.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          res.status === 429
            ? "Terlalu banyak permintaan. Coba lagi sebentar lagi."
            : data.error ?? "Terjadi kesalahan."
        );
      } else {
        setAlerts(data.alerts ?? []);
        setRecommendations(data.recommendations ?? []);
      }
    } catch {
      setError("Tidak bisa menghubungi server. Cek koneksi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="border border-alert/40 bg-alert/5 rounded-lg px-4 py-3 mb-6">
        <p className="text-xs text-foam/80">
          <span className="text-alert font-mono">PERINGATAN:</span> ini alat
          bantu baca data on-chain, bukan sinyal jaminan profit. Harga eksekusi
          dan estimasi profit bersifat pendekatan (bukan data historis pasti).
          Selalu verifikasi sendiri sebelum mengambil keputusan trading.
        </p>
      </div>

      <TrendingList onSelect={(mint) => setMint(mint)} />

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          placeholder="Alamat mint token Solana (contoh: EPjFWdd5...)"
          className="flex-1 bg-surface border border-border rounded px-3 py-2.5 text-sm font-mono text-foam placeholder:text-muted outline-none focus:border-signal/50"
        />
        <button
          onClick={handleScan}
          disabled={loading || !mint.trim()}
          className="px-5 py-2.5 bg-signal text-abyss font-medium text-sm rounded hover:bg-signal/90 disabled:opacity-40 transition-colors shrink-0"
        >
          {loading ? "Memindai…" : "Scan Whale →"}
        </button>
      </div>

      {error && <p className="text-alert text-sm mb-6">{error}</p>}

      {loading && (
        <div className="flex items-center gap-2 text-signal text-xs font-mono mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-signal pulse-dot" />
          Memindai transaksi on-chain…
        </div>
      )}

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface border border-border rounded" />
          ))}
        </div>
      )}

      {alerts && alerts.length === 0 && recommendations?.length === 0 && !loading && (
        <p className="text-sm text-muted italic">
          Tidak ada whale transaction ≥ $100.000 terdeteksi di 50 transaksi terakhir pool ini.
        </p>
      )}

      {alerts && alerts.length > 0 && (
        <div className="mb-8">
          <span className="font-mono text-xs tracking-widest text-signal">ALERTS</span>
          <div className="space-y-2 mt-3">
            {alerts.map((a, i) => (
              <div key={i} className="border border-border rounded-lg bg-surface p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono text-sm text-foam">{a.token}</span>
                    <span className="text-xs text-muted ml-2">{shortAddr(a.whale_address)}</span>
                  </div>
                  <span className="text-xs font-mono text-signal shrink-0">
                    ${a.transaction_value_usd?.toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-sm text-foam/80 mt-2">{a.alasan_analisis}</p>
                <div className="flex gap-3 mt-2 text-xs text-muted font-mono">
                  <span>profit est. {a.profit_estimate_percent}%</span>
                  <span>confidence: {a.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recommendations && recommendations.length > 0 && (
        <div>
          <span className="font-mono text-xs tracking-widest text-signal">RECOMMENDATIONS</span>
          <div className="space-y-2 mt-3">
            {recommendations.map((r, i) => (
              <div key={i} className="border border-border rounded-lg bg-surface p-4">
                <span className="font-mono text-sm text-foam">{r.token}</span>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs font-mono text-muted">
                  <span>entry: {r.entry_price}</span>
                  <span>target: {r.target_price}</span>
                  <span>stop: {r.stop_loss_price}</span>
                </div>
                <p className="text-sm text-foam/80 mt-2">{r.alasan_analisis}</p>
                <p className="text-xs text-alert/80 mt-2 italic">{r.disclaimer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
