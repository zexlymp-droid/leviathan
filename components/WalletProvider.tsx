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

  // Cast to `any` here: @solana/wallet-adapter-react's component types were
  // written against an older React type signature, which conflicts with
  // newer @types/react's stricter FC return type (ReactNode | Promise<ReactNode>).
  // This is purely a type-declaration mismatch, not a runtime bug — these
  // components work fine, so we sidestep the type checker at this one spot.
  const AnyConnectionProvider = ConnectionProvider as any;
  const AnySolanaWalletProvider = SolanaWalletProvider as any;
  const AnyWalletModalProvider = WalletModalProvider as any;

  return (
    <AnyConnectionProvider endpoint={endpoint}>
      <AnySolanaWalletProvider wallets={wallets} autoConnect>
        <AnyWalletModalProvider>{children}</AnyWalletModalProvider>
      </AnySolanaWalletProvider>
    </AnyConnectionProvider>
  );
}
