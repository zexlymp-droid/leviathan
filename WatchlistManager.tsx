"use client";

import { useEffect, useState } from "react";

type Whale = {
  id: string;
  address: string;
  label: string;
  copyAmountSol: number;
  autoApprove: boolean;
};

export default function WatchlistManager() {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [copyAmount, setCopyAmount] = useState("0.1");
  const [error, setError] = useState<string | null>(null);

  async function loadWhales() {
    setLoading(true);
    try {
      const res = await fetch("/api/whales");
      const data = await res.json();
      setWhales(data.whales ?? []);
    } catch {
      setError("Gagal memuat watchlist.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWhales();
  }, []);

  async function handleAdd() {
    if (!address.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/whales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          label: label.trim(),
          copyAmountSol: parseFloat(copyAmount) || 0,
          autoApprove: false, // always starts off — user opts in per-whale after
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Gagal menambah whale.");
        return;
      }
      setAddress("");
      setLabel("");
      setCopyAmount("0.1");
      loadWhales();
    } catch {
      setError("Gagal menghubungi server.");
    }
  }

  async function handleRemove(id: string) {
    await fetch("/api/whales", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadWhales();
  }

  async function handleUpdateAmount(id: string, copyAmountSol: number) {
    await fetch("/api/whales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, copyAmountSol }),
    });
    setWhales((prev) =>
      prev.map((w) => (w.id === id ? { ...w, copyAmountSol } : w))
    );
  }

  async function handleToggleAuto(id: string, autoApprove: boolean) {
    await fetch("/api/whales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, autoApprove }),
    });
    setWhales((prev) =>
      prev.map((w) => (w.id === id ? { ...w, autoApprove } : w))
    );
  }

  return (
    <div>
      <div className="border border-border rounded-lg bg-surface p-4 mb-6">
        <p className="text-xs font-mono text-signal mb-3">TAMBAH WHALE</p>
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Alamat wallet whale"
            className="bg-abyss border border-border rounded px-3 py-2 text-sm font-mono text-foam placeholder:text-muted outline-none focus:border-signal/50"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (opsional)"
            className="bg-abyss border border-border rounded px-3 py-2 text-sm text-foam placeholder:text-muted outline-none focus:border-signal/50"
          />
          <input
            value={copyAmount}
            onChange={(e) => setCopyAmount(e.target.value)}
            type="number"
            step="0.01"
            placeholder="SOL"
            className="bg-abyss border border-border rounded px-3 py-2 text-sm font-mono text-foam placeholder:text-muted outline-none focus:border-signal/50"
          />
          <button
            onClick={handleAdd}
            className="bg-signal text-abyss text-sm font-medium rounded px-4 py-2 hover:bg-signal/90 transition-colors"
          >
            Tambah
          </button>
        </div>
        {error && <p className="text-xs text-alert mt-2">{error}</p>}
      </div>

      {loading ? (
        <p className="text-sm text-muted italic">Memuat watchlist…</p>
      ) : whales.length === 0 ? (
        <p className="text-sm text-muted italic">
          Belum ada whale dipantau. Tambahkan alamat wallet di atas.
        </p>
      ) : (
        <div className="space-y-2">
          {whales.map((w) => (
            <div
              key={w.id}
              className="border border-border rounded-lg bg-surface p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm text-foam">{w.label}</p>
                <p className="text-xs text-muted font-mono">
                  {w.address.slice(0, 6)}…{w.address.slice(-6)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-muted font-mono">Copy amount</label>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={w.copyAmountSol}
                  onBlur={(e) => handleUpdateAmount(w.id, parseFloat(e.target.value) || 0)}
                  className="w-20 bg-abyss border border-border rounded px-2 py-1 text-xs font-mono text-foam outline-none focus:border-signal/50"
                />
                <span className="text-xs text-muted font-mono">SOL</span>

                <button
                  onClick={() => handleToggleAuto(w.id, !w.autoApprove)}
                  className={`text-xs font-mono rounded px-2.5 py-1 ml-2 transition-colors ${
                    w.autoApprove
                      ? "bg-alert/20 text-alert border border-alert/40"
                      : "bg-abyss text-muted border border-border"
                  }`}
                  title={
                    w.autoApprove
                      ? "Auto-approve AKTIF — trade dieksekusi otomatis (masih tunduk kill switch & limit global)"
                      : "Manual approve — kamu konfirmasi tiap trade sendiri"
                  }
                >
                  {w.autoApprove ? "⚡ Auto" : "Manual"}
                </button>

                <button
                  onClick={() => handleRemove(w.id)}
                  className="text-xs text-alert hover:text-alert/80 ml-2"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
