import { useEffect, useRef, useState } from "react";
import { apiGet, type CatalogNode, type SearchResponse } from "../lib/api";

type Props = {
  onSelect: (node: CatalogNode) => void;
};

export default function SeriesSearch({ onSelect }: Props) {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResp(null);
      return;
    }
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(q.trim())}&limit=30`)
        .then((r) => {
          if (alive) {
            setResp(r);
            setOpen(true);
          }
        })
        .catch(() => {
          if (alive) setResp(null);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handlePick = (hit: { code: string; name: string; datagroup: string }) => {
    onSelect({
      id: hit.code,
      label: hit.name,
      type: "series",
      has_children: false,
      datagroup: hit.datagroup,
    });
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
  };

  const results = resp?.results ?? [];

  return (
    <div ref={wrapRef} className="relative border-b border-ink/15 bg-cream/70 px-2 py-2">
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => resp && setOpen(true)}
        placeholder="Seri ara (ör. enflasyon, USD, işsizlik)"
        className="w-full rounded border border-ink/20 bg-white px-2 py-1.5 font-mono text-xs focus:border-ink focus:outline-none"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-2 right-2 top-full z-20 mt-1 max-h-[70vh] overflow-y-auto rounded border border-ink/20 bg-cream shadow-lg">
          {loading && <div className="px-3 py-2 text-[11px] text-ink/50">Aranıyor…</div>}
          {!loading && resp && !resp.index_ready && resp.index_building && (
            <div className="px-3 py-2 text-[11px] text-ink/60">
              Arama dizini oluşturuluyor (ilk kez, birkaç dakika sürebilir). Sonra tekrar dene.
            </div>
          )}
          {!loading && resp && !resp.index_ready && !resp.index_building && (
            <div className="px-3 py-2 text-[11px] text-ink/60">
              Arama dizini henüz hazır değil. Birkaç saniye sonra tekrar dene.
            </div>
          )}
          {!loading && resp && resp.index_ready && results.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-ink/50">Eşleşme yok.</div>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-ink/10">
              {results.map((hit) => (
                <li key={hit.code}>
                  <button
                    type="button"
                    onClick={() => handlePick(hit)}
                    className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left text-xs hover:bg-ink/5"
                  >
                    <span className="truncate" title={hit.name}>{hit.name}</span>
                    <span className="flex items-center gap-2 text-[10px] text-ink/50">
                      <span className="truncate">{hit.datagroup_name}</span>
                      <span className="ml-auto font-mono">{hit.code}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
