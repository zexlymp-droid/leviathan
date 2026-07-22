"use client";

import { useState } from "react";
import { WalletMultiButton as WalletMultiButtonRaw } from "@solana/wallet-adapter-react-ui";
// Same type-declaration mismatch as WalletProvider.tsx — cast to sidestep it.
const WalletMultiButton = WalletMultiButtonRaw as any;
import WalletProvider from "@/components/WalletProvider";
import WhaleScan from "@/components/WhaleScan";
import WatchlistManager from "@/components/WatchlistManager";
import SafetyPanel from "@/components/SafetyPanel";
import PushSubscribe from "@/components/PushSubscribe";

type Tab = "scan" | "watchlist" | "safety";

export default function Home() {
  const [tab, setTab] = useState<Tab>("scan");

  return (
    <WalletProvider>
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-lg text-foam tracking-tight">
            LEVIATHAN
          </span>
          <div className="flex items-center gap-3">
            <PushSubscribe />
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <header className="mb-8">
          <span className="font-mono text-xs tracking-widest text-signal">
            SOLANA WHALE SCANNER
          </span>
          <h1 className="font-display font-semibold text-3xl md:text-4xl text-foam mt-3 leading-tight">
            Lacak transaksi besar,
            <br />
            langsung dari blockchain.
          </h1>
        </header>

        <div className="flex gap-4 mb-8 border-b border-border">
          {(
            [
              ["scan", "Scan Manual"],
              ["watchlist", "Watchlist Auto"],
              ["safety", "Safety"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-xs font-mono tracking-widest pb-3 border-b-2 transition-colors ${
                tab === key
                  ? "text-signal border-signal"
                  : "text-muted border-transparent hover:text-foam"
              }`}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>

        {tab === "scan" && <WhaleScan />}
        {tab === "watchlist" && <WatchlistManager />}
        {tab === "safety" && <SafetyPanel />}

        <footer className="hairline pt-6 mt-16 text-xs text-muted font-mono">
          Data on-chain via DexScreener & Helius. Bukan nasihat finansial.
        </footer>
      </main>
    </WalletProvider>
  );
}
