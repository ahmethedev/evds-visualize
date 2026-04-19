import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { apiGet, type Composition, type CompositionNode, type Timeline } from "../lib/api";
import { DATAGROUPS, DEFAULT_DATAGROUP, getDatagroup } from "../lib/datagroups";
import { formatDateTR, formatTLCompact, formatNumber } from "../lib/format";
import Breadcrumb from "../components/Breadcrumb";
import Treemap, { type TreemapView } from "../components/Treemap";
import TimelineScrubber from "../components/TimelineScrubber";

const VIEWS: { id: TreemapView; label: string }[] = [
  { id: "tree", label: "Tree" },
  { id: "bar", label: "Bar" },
  { id: "bar-pct", label: "Bar%" },
];

function parseView(v: string | null): TreemapView {
  return v === "bar" || v === "bar-pct" ? v : "tree";
}

function findByPath(root: CompositionNode, codes: string[]): CompositionNode[] {
  const trail: CompositionNode[] = [root];
  let cur = root;
  for (const code of codes) {
    const next = cur.children.find((c) => c.code === code);
    if (!next) break;
    trail.push(next);
    cur = next;
  }
  return trail;
}

export default function MapRoute() {
  const { datagroup = DEFAULT_DATAGROUP } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Composition | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pathParam = searchParams.get("path") ?? "";
  const pathCodes = useMemo(
    () => (pathParam ? pathParam.split(",").filter(Boolean) : []),
    [pathParam],
  );
  const asofParam = searchParams.get("asof");
  const view = parseView(searchParams.get("view"));

  const meta = getDatagroup(datagroup);
  const unitMode = meta?.unit ?? "currency";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    const url = asofParam
      ? `/api/composition/${datagroup}?asof=${asofParam}`
      : `/api/composition/${datagroup}`;
    apiGet<Composition>(url)
      .then((d) => {
        if (alive) setData(d);
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
  }, [datagroup, asofParam]);

  useEffect(() => {
    let alive = true;
    setTimeline(null);
    apiGet<Timeline>(`/api/composition/${datagroup}/timeline`)
      .then((d) => {
        if (alive) setTimeline(d);
      })
      .catch(() => {
        // Non-fatal: timeline missing, scrubber simply not shown.
      });
    return () => {
      alive = false;
    };
  }, [datagroup]);

  function setAsof(date: string) {
    const next = new URLSearchParams(searchParams);
    next.set("asof", date);
    setSearchParams(next, { replace: true });
  }

  function setView(v: TreemapView) {
    const next = new URLSearchParams(searchParams);
    if (v === "tree") next.delete("view");
    else next.set("view", v);
    setSearchParams(next, { replace: true });
  }

  const trail = useMemo(() => {
    if (!data) return [] as CompositionNode[];
    return findByPath(data.root, pathCodes);
  }, [data, pathCodes]);

  const current = trail.length > 0 ? trail[trail.length - 1] : data?.root ?? null;
  const parent = trail.length > 1 ? trail[trail.length - 2] : null;

  function goDeeper(child: CompositionNode) {
    const next = [...pathCodes, child.code];
    const params = new URLSearchParams(searchParams);
    params.set("path", next.join(","));
    setSearchParams(params, { replace: false });
  }

  function setTrailIndex(i: number) {
    const next = pathCodes.slice(0, i);
    const params = new URLSearchParams(searchParams);
    if (next.length === 0) params.delete("path");
    else params.set("path", next.join(","));
    setSearchParams(params, { replace: false });
  }

  const parentPct =
    parent && parent.value && current && current.value !== null
      ? (current.value / parent.value) * 100
      : null;

  return (
    <main className="mx-auto max-w-6xl p-6 font-mono">
      <header className="mb-6">
        <button
          type="button"
          className="mb-2 text-xs opacity-60 underline decoration-dotted underline-offset-4 hover:opacity-100"
          onClick={() => navigate("/")}
        >
          ← Ana sayfa
        </button>
        <h1 className="font-serif text-3xl">Ekonomi Haritası</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DATAGROUPS.map((g) => (
            <button
              key={g.code}
              type="button"
              onClick={() => navigate(`/map/${g.code}`)}
              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                g.code === datagroup
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/30 hover:border-ink/60"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </header>

      {loading && <p className="opacity-70">Yükleniyor…</p>}
      {error && <p className="text-red-700">Hata: {error}</p>}

      {data && current && (
        <>
          <section className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <Breadcrumb trail={trail.length > 0 ? trail : [data.root]} onSelect={setTrailIndex} />
            <div className="text-xs opacity-70">
              {formatDateTR(data.asof)}
              {data.total_source === "reported" ? " · raporlanan toplam" : " · bileşen toplamı"}
            </div>
          </section>

          <section className="mb-4 flex flex-wrap items-baseline gap-4">
            <div>
              <div className="text-xs opacity-60">{current.name}</div>
              <div className="font-serif text-2xl">
                {unitMode === "currency"
                  ? formatTLCompact(current.value)
                  : formatNumber(current.value)}
              </div>
            </div>
            {parentPct !== null && parent && (
              <div className="text-xs opacity-70">
                <span className="opacity-60">{parent.name}</span>{" "}
                içinde {parentPct.toFixed(1)}%
              </div>
            )}
          </section>

          <div className="mb-2 flex items-center justify-end gap-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`rounded border px-2.5 py-1 text-[11px] transition-colors ${
                  v.id === view
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/30 hover:border-ink/60"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <Treemap
            node={current}
            rootTotal={data.total}
            unitMode={unitMode}
            view={view}
            onDrill={goDeeper}
          />

          {timeline && timeline.points.length > 1 && (
            <section className="mt-4">
              <TimelineScrubber
                points={timeline.points}
                selectedDate={data.asof ?? asofParam}
                onChange={setAsof}
              />
            </section>
          )}

          {meta?.note && (
            <p className="mt-3 text-xs opacity-60">Not: {meta.note}</p>
          )}
          {unitMode === "index" && (
            <p className="mt-3 text-xs opacity-60">
              Not: TÜFE bir endekstir; alt-dallar toplamı üst değere eşit değildir.
              Boyutlandırma endeks değerine göre yapılır (Faz 2'de ağırlık-bazlı
              görünüm gelecek).
            </p>
          )}
          {data.total_source === "sum" && unitMode === "currency" && (
            <p className="mt-2 text-xs opacity-60">
              Not: Bu datagrupta açık bir "Toplam" serisi yok; üst değer alt
              dalların toplamıdır.
            </p>
          )}
        </>
      )}
    </main>
  );
}
