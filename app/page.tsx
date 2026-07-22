import Link from "next/link";

const features = [
  {
    href: "/scan",
    title: "Scan Manual",
    desc: "Cek satu token kapan aja — data harga & transaksi langsung dari on-chain.",
  },
  {
    href: "/watchlist",
    title: "Watchlist Auto",
    desc: "Pantau whale favorit, dapat notifikasi tiap mereka beli/jual.",
  },
  {
    href: "/safety",
    title: "Safety",
    desc: "Kill switch & limit untuk fitur auto-trade.",
  },
];

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-14">
      <header className="mb-12">
        <span className="font-mono text-xs tracking-widest text-signal">
          SOLANA WHALE SCANNER
        </span>
        <h1 className="font-display font-semibold text-3xl md:text-4xl text-foam mt-3 leading-tight">
          Lacak transaksi besar,
          <br />
          langsung dari blockchain.
        </h1>
        <p className="text-muted mt-4 max-w-lg font-body text-sm">
          Data on-chain nyata dari DexScreener & Helius — bukan tebakan AI.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="border border-border rounded-lg bg-surface p-5 hover:border-signal/50 transition-colors"
          >
            <h2 className="font-display font-semibold text-foam">{f.title}</h2>
            <p className="text-xs text-muted mt-2">{f.desc}</p>
          </Link>
        ))}
      </div>

      <footer className="hairline pt-6 mt-16 text-xs text-muted font-mono">
        Data on-chain via DexScreener & Helius. Bukan nasihat finansial.
      </footer>
    </main>
  );
}
