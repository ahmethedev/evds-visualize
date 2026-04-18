import { useEffect, useState } from "react";
import { apiGet, type Health } from "../lib/api";

export default function Landing() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Health>("/healthz")
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-8 font-mono">
      <h1 className="font-serif text-4xl mb-2">EVDS Görselleştirme</h1>
      <p className="text-sm opacity-70 mb-8">Faz 0 — iskele ayakta.</p>

      <section className="border border-ink/20 p-4 rounded">
        <h2 className="font-serif text-xl mb-2">Backend durumu</h2>
        {error && <p className="text-red-700">Hata: {error}</p>}
        {!error && !health && <p>Yükleniyor…</p>}
        {health && (
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
