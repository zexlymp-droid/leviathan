"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";

export default function CopyTradeButton({
  tokenMint,
  direction,
  amountSol,
}: {
  tokenMint: string;
  direction: "buy" | "sell";
  amountSol: number;
}) {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [status, setStatus] = useState<"idle" | "preparing" | "signing" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  async function handleCopyTrade() {
    if (!publicKey || !signTransaction) {
      setError("Connect wallet dulu.");
      return;
    }

    setStatus("preparing");
    setError(null);

    try {
      const res = await fetch("/api/copy-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPublicKey: publicKey.toBase58(),
          tokenMint,
          amountSol,
          direction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menyiapkan transaksi.");
        setStatus("error");
        return;
      }

      setStatus("signing");
      const txBuffer = Buffer.from(data.swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // User approves in their own wallet — this app never signs on its own
      const signed = await signTransaction(transaction);
      const signature = await connection.sendTransaction(signed);

      setTxSignature(signature);
      setStatus("sent");
    } catch (err: any) {
      console.error("Copy trade error:", err);
      setError(err?.message ?? "Transaksi dibatalkan atau gagal.");
      setStatus("error");
    }
  }

  if (status === "sent" && txSignature) {
    return (
      <a
        href={`https://solscan.io/tx/${txSignature}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-mono text-signal underline"
      >
        ✓ Terkirim — lihat di Solscan
      </a>
    );
  }

  return (
    <div>
      <button
        onClick={handleCopyTrade}
        disabled={!publicKey || status === "preparing" || status === "signing"}
        className="text-xs font-mono text-abyss bg-signal hover:bg-signal/90 disabled:opacity-40 rounded px-3 py-1.5 transition-colors"
      >
        {status === "preparing"
          ? "Menyiapkan…"
          : status === "signing"
          ? "Konfirmasi di wallet…"
          : `Copy ${direction === "buy" ? "Buy" : "Sell"} (${amountSol} SOL)`}
      </button>
      {!publicKey && (
        <p className="text-xs text-muted mt-1">Connect wallet dulu untuk copy trade.</p>
      )}
      {error && <p className="text-xs text-alert mt-1">{error}</p>}
    </div>
  );
}
