"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletMultiButton as WalletMultiButtonRaw } from "@solana/wallet-adapter-react-ui";
import PushSubscribe from "./PushSubscribe";

// Same type-declaration mismatch as WalletProvider.tsx — cast to sidestep it.
const WalletMultiButton = WalletMultiButtonRaw as any;

const links = [
  { href: "/scan", label: "Scan" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/safety", label: "Safety" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border sticky top-0 z-40 bg-abyss/90 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="font-display font-semibold text-lg text-foam tracking-tight shrink-0">
          LEVIATHAN
        </Link>

        <div className="hidden sm:flex items-center gap-5 font-mono text-xs tracking-widest">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "text-signal"
                  : "text-muted hover:text-foam transition-colors"
              }
            >
              {l.label.toUpperCase()}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PushSubscribe />
          <WalletMultiButton />
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="sm:hidden flex items-center gap-4 px-6 pb-3 font-mono text-xs tracking-widest">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "text-signal" : "text-muted"}
          >
            {l.label.toUpperCase()}
          </Link>
        ))}
      </div>
    </nav>
  );
}
