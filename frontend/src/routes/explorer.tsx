import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { apiGet, type CatalogNode, type SeriesResponse } from "../lib/api";
import CategoryTree from "../components/CategoryTree";
import SeriesChart from "../components/SeriesChart";
import Disclaimer from "../components/Disclaimer";
import { formatNumber } from "../lib/format";

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get("code");
  const datagroup = searchParams.get("dg");
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) {
      setSeries(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const q = new URLSearchParams();
    if (datagroup) q.set("datagroup", datagroup);
    apiGet<SeriesResponse>(`/api/series/${encodeURIComponent(code)}?${q.toString()}`)
      .then((res) => {
        if (!alive) return;
        setSeries(res);
      })
      .catch((e) => {
        if (alive) setError(String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [code, datagroup]);

  const onSelectSeries = (node: CatalogNode) => {
    setLabel(node.label);
    const params = new URLSearchParams();
    params.set("code", node.id);
    if (node.datagroup) params.set("dg", node.datagroup);
    setSearchParams(params);
  };

  const latest = series?.points[series.points.length - 1];

  return (
    <main className="flex h-screen flex-col bg-cream text-ink">
      <header className="flex items-center justify-between border-b border-ink/15 px-6 py-3 font-mono">
        <div className="flex items-baseline gap-6">
          <Link to="/" className="font-serif text-2xl tracking-tight">
            makroturkiye
          </Link>
          <nav className="flex gap-4 text-xs">
            <Link to="/" className="text-ink/60 hover:text-ink">
              Türkiye Bugün
            </Link>
            <Link to="/map" className="text-ink/60 hover:text-ink">
              Ekonomi Haritası
            </Link>
            <span className="font-semibold">Seri Keşfi</span>
          </nav>
        </div>
        <a
          href="https://evds3.tcmb.gov.tr"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] uppercase tracking-wider text-ink/40 hover:text-ink/70"
        >
          Kaynak: TCMB EVDS
        </a>
      </header>
      <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden">
        <CategoryTree selectedId={code} onSelectSeries={onSelectSeries} />
        <section className="flex flex-col overflow-hidden relative">
          {!code && (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink/50">
              Soldaki ağaçtan bir seri seç.
            </div>
          )}
          {code && (
            <>
              <div className="border-b border-ink/15 px-6 py-4 font-mono">
                <div className="text-xs uppercase tracking-wide text-ink/50">
                  {series?.source ?? ""} {series?.freq ? `· ${series.freq}` : ""}
                </div>
                <h1 className="mt-1 font-serif text-2xl">
                  {series?.name ?? label ?? code}
                </h1>
                <div className="mt-1 text-[11px] text-ink/50">{code}</div>
                {latest && (
                  <div className="mt-3 flex items-baseline gap-6 text-sm">
                    <div>
                      <span className="text-ink/50">Son değer: </span>
                      <span className="font-semibold">{formatNumber(latest.value)}</span>
                    </div>
                    <div className="text-ink/50">
                      {new Date(latest.date).toLocaleDateString("tr-TR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 p-6">
                {loading && <div className="text-sm text-ink/50">Yükleniyor…</div>}
                {error && <div className="text-sm text-rose-700">{error}</div>}
                {series && !loading && !error && (
                  <SeriesChart points={series.points} label={series.name ?? undefined} />
                )}
              </div>
            </>
          )}
          <div className="border-t border-ink/10 px-6 py-3">
            <Disclaimer />
          </div>
        </section>
      </div>
    </main>
  );
}
