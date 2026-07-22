import WatchlistManager from "@/components/WatchlistManager";

export default function WatchlistPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <span className="font-mono text-xs tracking-widest text-signal">WATCHLIST AUTO</span>
        <h1 className="font-display font-semibold text-2xl text-foam mt-2">
          Pantau Whale
        </h1>
        <p className="text-sm text-muted mt-2">
          Tambah alamat whale untuk dipantau otomatis. Atur nominal copy-trade
          per whale, aktifkan auto-approve kalau perlu (tetap tunduk kill
          switch global di tab Safety).
        </p>
      </header>
      <WatchlistManager />
    </main>
  );
}
