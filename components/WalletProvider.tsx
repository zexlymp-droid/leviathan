"use client";

import { useMemo, ReactNode } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, TrustWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Default styles for the wallet modal UI
import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: ReactNode }) {
  // Use a public RPC by default; swap to a Helius RPC URL for better reliability
  // if you hit rate limits: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
  const endpoint = useMemo(() => clusterApiUrl("mainnet-beta"), []);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new TrustWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
