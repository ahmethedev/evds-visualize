import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { exportCsv, exportSvgAsPng } from "../lib/export";
import { apiGet, type CatalogNode, type SeriesResponse } from "../lib/api";
import CategoryTree from "../components/CategoryTree";
import SeriesChart from "../components/SeriesChart";
import SeriesSearch from "../components/SeriesSearch";
import Disclaimer from "../components/Disclaimer";
import { formatNumber } from "../lib/format";
import {
  applyRange,
  applyTransform,
  resample,
  FREQ_LABELS,
  RANGE_LABELS,
  TRANSFORM_LABELS,
  type FreqKey,
  type RangeKey,
  type TransformKey,
} from "../lib/transforms";

const RANGE_KEYS: RangeKey[] = ["1y", "5y", "10y", "all"];
const FREQ_KEYS: FreqKey[] = ["native", "monthly", "yearly"];
const TRANSFORM_KEYS: TransformKey[] = ["none", "yoy_pct", "ma3", "ma12"];

export default function Explorer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get("code");
  const datagroup = searchParams.get("dg");
  const range = (searchParams.get("range") as RangeKey) || "all";
  const freq = (searchParams.get("freq") as FreqKey) || "native";
  const transform = (searchParams.get("tx") as TransformKey) || "none";
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setParam = (key: string, value: string, defaultValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const shownPoints = useMemo(() => {
    if (!series) return [];
    const resampled = resample(series.points, freq);
    const transformed = applyTransform(resampled, transform);
    return applyRange(transformed, range);
  }, [series, freq, transform, range]);

  const valueSuffix = transform === "yoy_pct" ? "%" : "";

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
  const lastShown = shownPoints[shownPoints.length - 1];
  const svgRef = useRef<SVGSVGElement | null>(null);

  const downloadName = useMemo(() => {
    const base = series?.name ?? label ?? code ?? "series";
    const tx = transform !== "none" ? `_${transform}` : "";
    const fr = freq !== "native" ? `_${freq}` : "";
    return `${base}${fr}${tx}`;
  }, [series, label, code, transform, freq]);

  const handleCsv = () => {
    if (!shownPoints.length) return;
    const header = transform === "yoy_pct" ? "yoy_pct" : "value";
    exportCsv(shownPoints, downloadName, header);
  };

  const handlePng = () => {
    if (!svgRef.current) return;
    exportSvgAsPng(svgRef.current, downloadName).catch((e) => console.error(e));
  };

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
        <div className="flex flex-col overflow-hidden border-r border-ink/15 bg-cream/50">
          <SeriesSearch onSelect={onSelectSeries} />
          <div className="flex-1 overflow-hidden">
            <CategoryTree selectedId={code} onSelectSeries={onSelectSeries} />
          </div>
        </div>
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
              <div className="flex flex-wrap items-center gap-4 border-b border-ink/10 px-6 py-2 font-mono text-[11px]">
                <ToolbarGroup label="Aralık">
                  {RANGE_KEYS.map((k) => (
                    <ToolbarButton
                      key={k}
                      active={range === k}
                      onClick={() => setParam("range", k, "all")}
                    >
                      {RANGE_LABELS[k]}
                    </ToolbarButton>
                  ))}
                </ToolbarGroup>
                <ToolbarGroup label="Sıklık">
                  {FREQ_KEYS.map((k) => (
                    <ToolbarButton
                      key={k}
                      active={freq === k}
                      onClick={() => setParam("freq", k, "native")}
                    >
                      {FREQ_LABELS[k]}
                    </ToolbarButton>
                  ))}
                </ToolbarGroup>
                <ToolbarGroup label="Dönüşüm">
                  {TRANSFORM_KEYS.map((k) => (
                    <ToolbarButton
                      key={k}
                      active={transform === k}
                      onClick={() => setParam("tx", k, "none")}
                    >
                      {TRANSFORM_LABELS[k]}
                    </ToolbarButton>
                  ))}
                </ToolbarGroup>
                {lastShown && transform !== "none" && (
                  <div className="ml-auto text-ink/60">
                    {TRANSFORM_LABELS[transform]}:{" "}
                    <span className="font-semibold text-ink">
                      {formatNumber(lastShown.value)}
                      {valueSuffix}
                    </span>
                  </div>
                )}
                <div className={`flex gap-1 ${lastShown && transform !== "none" ? "" : "ml-auto"}`}>
                  <button
                    type="button"
                    onClick={handleCsv}
                    disabled={!shownPoints.length}
                    className="rounded border border-ink/20 px-2 py-1 hover:bg-ink/5 disabled:opacity-40"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handlePng}
                    disabled={!shownPoints.length}
                    className="rounded border border-ink/20 px-2 py-1 hover:bg-ink/5 disabled:opacity-40"
                  >
                    PNG
                  </button>
                </div>
              </div>
              <div className="flex-1 p-6">
                {loading && <div className="text-sm text-ink/50">Yükleniyor…</div>}
                {error && <div className="text-sm text-rose-700">{error}</div>}
                {series && !loading && !error && (
                  <SeriesChart
                    points={shownPoints}
                    label={series.name ?? undefined}
                    valueSuffix={valueSuffix}
                    svgRef={svgRef}
                  />
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

function ToolbarGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="uppercase tracking-wider text-ink/40">{label}</span>
      <div className="flex overflow-hidden rounded border border-ink/15">{children}</div>
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-l border-ink/15 px-2 py-1 first:border-l-0 ${
        active ? "bg-ink text-cream" : "text-ink/70 hover:bg-ink/5"
      }`}
    >
      {children}
    </button>
  );
}
