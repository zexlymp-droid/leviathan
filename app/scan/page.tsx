import WhaleScan from "@/components/WhaleScan";

export default function ScanPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <span className="font-mono text-xs tracking-widest text-signal">SCAN MANUAL</span>
        <h1 className="font-display font-semibold text-2xl text-foam mt-2">
          Whale Scanner
        </h1>
        <p className="text-sm text-muted mt-2">
          Masukkan alamat token, sistem mengambil data transaksi asli dari
          blockchain dan menghitung nilainya.
        </p>
      </header>
      <WhaleScan />
    </main>
  );
}
