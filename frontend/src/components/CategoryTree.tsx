import { useCallback, useEffect, useState, type ReactElement } from "react";
import { apiGet, type CatalogNode, type CatalogResponse } from "../lib/api";

type NodeState = {
  node: CatalogNode;
  depth: number;
  expanded: boolean;
  children: CatalogNode[] | null;
  loading: boolean;
};

type Props = {
  selectedId: string | null;
  onSelectSeries: (node: CatalogNode) => void;
};

export default function CategoryTree({ selectedId, onSelectSeries }: Props) {
  const [roots, setRoots] = useState<NodeState[]>([]);
  const [childrenByParent, setChildrenByParent] = useState<Record<string, NodeState[]>>({});
  const [rootError, setRootError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CatalogResponse>("/api/catalog")
      .then((res) => {
        setRoots(
          res.children.map((c) => ({
            node: c,
            depth: 0,
            expanded: false,
            children: null,
            loading: false,
          })),
        );
      })
      .catch((e) => setRootError(String(e)));
  }, []);

  const loadChildren = useCallback(async (parentId: string): Promise<NodeState[]> => {
    const res = await apiGet<CatalogResponse>(
      `/api/catalog?parent=${encodeURIComponent(parentId)}`,
    );
    return res.children.map((c) => ({
      node: c,
      depth: 0, // depth is set by caller when rendering
      expanded: false,
      children: null,
      loading: false,
    }));
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      // Find whether it's a root
      const rootIdx = roots.findIndex((n) => n.node.id === id);
      if (rootIdx !== -1) {
        const entry = roots[rootIdx];
        const nextExpanded = !entry.expanded;
        if (nextExpanded && !childrenByParent[id]) {
          setRoots((rs) =>
            rs.map((r, i) => (i === rootIdx ? { ...r, loading: true } : r)),
          );
          try {
            const children = await loadChildren(id);
            setChildrenByParent((m) => ({ ...m, [id]: children }));
          } catch (e) {
            console.error(e);
          }
        }
        setRoots((rs) =>
          rs.map((r, i) =>
            i === rootIdx ? { ...r, expanded: nextExpanded, loading: false } : r,
          ),
        );
        return;
      }
      // Non-root: find in childrenByParent
      for (const [parent, list] of Object.entries(childrenByParent)) {
        const idx = list.findIndex((n) => n.node.id === id);
        if (idx === -1) continue;
        const entry = list[idx];
        const nextExpanded = !entry.expanded;
        if (nextExpanded && !childrenByParent[id]) {
          setChildrenByParent((m) => ({
            ...m,
            [parent]: m[parent].map((n, i) => (i === idx ? { ...n, loading: true } : n)),
          }));
          try {
            const children = await loadChildren(id);
            setChildrenByParent((m) => ({ ...m, [id]: children }));
          } catch (e) {
            console.error(e);
          }
        }
        setChildrenByParent((m) => ({
          ...m,
          [parent]: m[parent].map((n, i) =>
            i === idx ? { ...n, expanded: nextExpanded, loading: false } : n,
          ),
        }));
        return;
      }
    },
    [roots, childrenByParent, loadChildren],
  );

  const handleClick = useCallback(
    (node: CatalogNode) => {
      if (node.type === "series") {
        onSelectSeries(node);
      } else {
        toggle(node.id);
      }
    },
    [onSelectSeries, toggle],
  );

  function renderList(list: NodeState[], depth: number): ReactElement[] {
    const out: ReactElement[] = [];
    for (const state of list) {
      const { node, expanded, loading } = state;
      const isSelected = selectedId === node.id;
      out.push(
        <li key={`${depth}:${node.id}`}>
          <button
            type="button"
            onClick={() => handleClick(node)}
            className={`group flex w-full items-start gap-1.5 px-2 py-1 text-left text-xs hover:bg-ink/5 ${
              isSelected ? "bg-ink/10 font-semibold" : ""
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <span className="mt-0.5 w-3 shrink-0 text-ink/40">
              {node.type === "series" ? "·" : expanded ? "▾" : "▸"}
            </span>
            <span className="flex-1 truncate" title={node.label}>
              {node.label}
            </span>
            {loading && <span className="text-ink/40">…</span>}
            {node.type === "datagroup" && (
              <span className="text-[10px] uppercase tracking-wide text-ink/40">
                {node.freq?.slice(0, 3)}
              </span>
            )}
          </button>
          {expanded && childrenByParent[node.id] && (
            <ul>{renderList(childrenByParent[node.id], depth + 1)}</ul>
          )}
        </li>,
      );
    }
    return out;
  }

  if (rootError) {
    return (
      <div className="p-3 text-xs text-rose-700">Katalog yüklenemedi: {rootError}</div>
    );
  }

  return (
    <nav className="h-full overflow-y-auto border-r border-ink/15 bg-cream/50 font-mono">
      <ul>{renderList(roots, 0)}</ul>
    </nav>
  );
}
