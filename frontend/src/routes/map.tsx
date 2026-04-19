import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { apiGet, type Composition, type CompositionNode } from "../lib/api";
import { formatDateTR, formatTLCompact, formatNumber } from "../lib/format";
import Breadcrumb from "../components/Breadcrumb";
import Treemap from "../components/Treemap";

const KNOWN_DATAGROUPS: { code: string; label: string; unit: "currency" | "index" }[] = [
  { code: "bie_tedavultut", label: "Tedavüldeki Banknotlar", unit: "currency" },
  { code: "bie_tukfiy2025", label: "TÜFE 2025", unit: "index" },
];

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
  const { datagroup = "bie_tedavultut" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Composition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pathParam = searchParams.get("path") ?? "";
  const pathCodes = useMemo(
    () => (pathParam ? pathParam.split(",").filter(Boolean) : []),
    [pathParam],
  );

  const meta = KNOWN_DATAGROUPS.find((g) => g.code === datagroup);
  const unitMode = meta?.unit ?? "currency";

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setData(null);
    apiGet<Composition>(`/api/composition/${datagroup}`)
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
  }, [datagroup]);

  const trail = useMemo(() => {
    if (!data) return [] as CompositionNode[];
    return findByPath(data.root, pathCodes);
  }, [data, pathCodes]);

  const current = trail.length > 0 ? trail[trail.length - 1] : data?.root ?? null;

  function goDeeper(child: CompositionNode) {
    const next = [...pathCodes, child.code];
    setSearchParams({ path: next.join(",") }, { replace: false });
  }

  function setTrailIndex(i: number) {
    const next = pathCodes.slice(0, i);
    if (next.length === 0) {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ path: next.join(",") }, { replace: false });
    }
  }

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
        <div className="mt-2 flex flex-wrap gap-2">
          {KNOWN_DATAGROUPS.map((g) => (
            <button
              key={g.code}
              type="button"
              onClick={() => navigate(`/map/${g.code}`)}
              className={`rounded border px-3 py-1 text-xs ${
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
            {unitMode === "currency" && data.total > 0 && current !== data.root && (
              <div className="text-xs opacity-70">
                toplamın {((current.value ?? 0) / data.total * 100).toFixed(1)}%'i
              </div>
            )}
          </section>

          <Treemap
            node={current}
            rootTotal={data.total}
            unitMode={unitMode}
            onDrill={goDeeper}
          />

          {unitMode === "index" && (
            <p className="mt-3 text-xs opacity-60">
              Not: TÜFE bir endekstir; alt-dallar toplamı üst değere eşit değildir.
              Boyutlandırma endeks değerine göre yapılır (Faz 2'de ağırlık-bazlı
              görünüm gelecek).
            </p>
          )}
        </>
      )}
    </main>
  );
}
