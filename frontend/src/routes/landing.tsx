import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiGet, type Dashboard } from "../lib/api";
import IndicatorCard from "../components/IndicatorCard";
import { DEFAULT_DATAGROUP } from "../lib/datagroups";

export default function Landing() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Dashboard>("/api/dashboard")
      .then(setDash)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-5xl px-6 py-12 font-mono">
        <header className="mb-10">
          <h1 className="font-serif text-5xl tracking-tight">Türkiye Bugün</h1>
          <p className="mt-2 max-w-2xl text-sm opacity-70">
            EVDS (TCMB Elektronik Veri Dağıtım Sistemi) verilerinden derlenen manşet göstergeler.
            Bir karta dokunarak o göstergenin ait olduğu kompozisyona gir.
          </p>
          <div className="mt-4 flex gap-3 text-xs">
            <Link
              to={`/map/${DEFAULT_DATAGROUP}`}
              className="rounded border border-ink/30 px-3 py-1.5 hover:border-ink/70"
            >
              Ekonomi Haritası →
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded border border-rose-700/30 bg-rose-50 p-4 text-sm text-rose-800">
            Dashboard yüklenemedi: {error}
          </div>
        )}

        {!error && !dash && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-md border border-ink/10 bg-white/30" />
            ))}
          </div>
        )}

        {dash && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {dash.indicators.map((ind) => (
                <IndicatorCard key={ind.key} ind={ind} />
              ))}
            </section>
            {dash.errors && Object.keys(dash.errors).length > 0 && (
              <p className="mt-6 text-[11px] opacity-50">
                Bazı göstergeler alınamadı: {Object.keys(dash.errors).join(", ")}
              </p>
            )}
          </>
        )}

        <footer className="mt-16 border-t border-ink/10 pt-6 text-[11px] opacity-50">
          Kaynak: TCMB EVDS — evds3.tcmb.gov.tr. Veriler cache'lenir; en son güncelleme tarihi kartın altında.
        </footer>
      </div>
    </main>
  );
}
