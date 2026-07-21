"use client";

import { useEffect, useState } from "react";

type Safety = {
  killSwitch: boolean;
  maxPerTradeSol: number;
  dailyLimitSol: number;
  dailyUsedSol: number;
};

export default function SafetyPanel() {
  const [safety, setSafety] = useState<Safety | null>(null);
  const [hotWalletAddress, setHotWalletAddress] = useState<string | null>(null);
  const [hotWalletBalance, setHotWalletBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/safety");
      const data = await res.json();
      setSafety(data.safety);
      setHotWalletAddress(data.hotWalletAddress);
      setHotWalletBalance(data.hotWalletBalance);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateSafety(patch: Partial<Safety>) {
    setSaving(true);
    await fetch("/api/safety", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSafety((prev) => (prev ? { ...prev, ...patch } : prev));
    setSaving(false);
  }

  if (loading || !safety) {
    return <p className="text-sm text-muted italic">Memuat konfigurasi keamanan…</p>;
  }

  const autoTradeOn = !safety.killSwitch;

  return (
    <div className="space-y-4">
      {/* Kill switch — the big, obvious control */}
      <div
        className={`border rounded-lg p-4 flex items-center justify-between ${
          autoTradeOn ? "border-alert/50 bg-alert/5" : "border-border bg-surface"
        }`}
      >
        <div>
          <p className="text-sm font-medium text-foam">
            Auto-trade: {autoTradeOn ? "AKTIF" : "MATI"}
          </p>
          <p className="text-xs text-muted mt-1">
            {autoTradeOn
              ? "Hot wallet akan trading otomatis untuk whale yang di-set auto-approve."
              : "Semua trade butuh approve manual. Ini setelan default yang aman."}
          </p>
        </div>
        <button
          onClick={() => updateSafety({ killSwitch: !safety.killSwitch })}
          disabled={saving}
          className={`text-xs font-mono rounded px-4 py-2 transition-colors shrink-0 ${
            autoTradeOn
              ? "bg-alert text-abyss hover:bg-alert/90"
              : "bg-signal text-abyss hover:bg-signal/90"
          }`}
        >
          {autoTradeOn ? "Matikan Sekarang" : "Nyalakan Auto-trade"}
        </button>
      </div>

      {/* Hot wallet info */}
      <div className="border border-border rounded-lg bg-surface p-4">
        <p className="text-xs font-mono text-signal mb-2">HOT WALLET</p>
        {hotWalletAddress ? (
          <>
            <p className="text-xs font-mono text-foam break-all">{hotWalletAddress}</p>
            <p className="text-sm text-muted mt-2">
              Saldo: <span className="text-foam">{hotWalletBalance ?? "—"} SOL</span>
            </p>
            <p className="text-xs text-muted mt-2">
              Setor SOL ke alamat ini untuk dipakai auto-trade. Jangan setor lebih
              dari yang kamu rela hilang sepenuhnya.
            </p>
          </>
        ) : (
          <p className="text-xs text-alert">
            Hot wallet belum di-setup. Isi HOT_WALLET_PRIVATE_KEY di environment variables.
          </p>
        )}
      </div>

      {/* Limits */}
      <div className="border border-border rounded-lg bg-surface p-4 space-y-3">
        <p className="text-xs font-mono text-signal">BATASAN</p>
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted">Maks. per trade (SOL)</label>
          <input
            type="number"
            step="0.01"
            defaultValue={safety.maxPerTradeSol}
            onBlur={(e) => updateSafety({ maxPerTradeSol: parseFloat(e.target.value) || 0 })}
            className="w-24 bg-abyss border border-border rounded px-2 py-1 text-xs font-mono text-foam text-right outline-none focus:border-signal/50"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted">Limit harian (SOL)</label>
          <input
            type="number"
            step="0.01"
            defaultValue={safety.dailyLimitSol}
            onBlur={(e) => updateSafety({ dailyLimitSol: parseFloat(e.target.value) || 0 })}
            className="w-24 bg-abyss border border-border rounded px-2 py-1 text-xs font-mono text-foam text-right outline-none focus:border-signal/50"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Terpakai hari ini</span>
          <span className="font-mono text-foam">
            {safety.dailyUsedSol} / {safety.dailyLimitSol} SOL
          </span>
        </div>
      </div>
    </div>
  );
}
