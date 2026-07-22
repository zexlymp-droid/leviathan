import SafetyPanel from "@/components/SafetyPanel";

export default function SafetyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <span className="font-mono text-xs tracking-widest text-signal">SAFETY</span>
        <h1 className="font-display font-semibold text-2xl text-foam mt-2">
          Kontrol Keamanan
        </h1>
        <p className="text-sm text-muted mt-2">
          Kill switch dan limit trade untuk fitur auto-trade. Semua mulai dari
          MATI secara default.
        </p>
      </header>
      <SafetyPanel />
    </main>
  );
}
