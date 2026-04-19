import { hierarchy, treemap } from "d3-hierarchy";
import { scaleOrdinal } from "d3-scale";
import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { CompositionNode } from "../lib/api";
import { formatPercent, formatTLCompact, formatNumber } from "../lib/format";

export type TreemapView = "tree" | "bar" | "bar-pct";

type Props = {
  node: CompositionNode;
  rootTotal: number;
  unitMode: "currency" | "index";
  view: TreemapView;
  onDrill: (node: CompositionNode) => void;
};

type TooltipState = {
  x: number;
  y: number;
  name: string;
  value: number;
  shareOfVisible: number;
  shareOfTotal: number;
} | null;

type Cell = {
  code: string;
  name: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
  topCode: string;
  hasKids: boolean;
  fitLabel: boolean;
};

const PALETTE = [
  "#d9c5a0", "#c8a87c", "#a9c0a6", "#b8cfd6", "#c9b6c7",
  "#e0d0b3", "#b2b8c8", "#d4b5a0", "#a4b59a", "#c2a8b4",
  "#bdb09a", "#9fb1bf", "#cbbfa4",
];

const TRANSITION = "transform 320ms ease, width 320ms ease, height 320ms ease";

export default function Treemap({ node, rootTotal, unitMode, view, onDrill }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 560 });
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width } = e.contentRect;
        setSize({ w: Math.max(320, width), h: Math.max(360, width * 0.62) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const cells: Cell[] = useMemo(() => {
    const children = (node.children && node.children.length > 0)
      ? node.children
      : [{ ...node, children: [] }];

    if (view === "tree") {
      const root = hierarchy({ name: node.name, children } as unknown as CompositionNode)
        .sum((d) => {
          const v = (d as CompositionNode).value ?? 0;
          const hasKids = (d as CompositionNode).children?.length > 0;
          return hasKids ? 0 : Math.max(0, v);
        })
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

      treemap<CompositionNode>()
        .size([size.w, size.h])
        .paddingInner(2)
        .paddingOuter(4)
        .round(true)(root as never);

      const topCodeOf = (leaf: any): string => {
        let cur = leaf;
        while (cur.parent && cur.parent.parent) cur = cur.parent;
        return (cur.data as CompositionNode).code;
      };

      return root.leaves().map((leaf: any) => {
        const d = leaf.data as CompositionNode;
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        return {
          code: d.code,
          name: d.name,
          value: leaf.value ?? 0,
          x: leaf.x0,
          y: leaf.y0,
          w,
          h,
          topCode: topCodeOf(leaf),
          hasKids: !!d.children && d.children.length > 0,
          fitLabel: w > 60 && h > 28,
        };
      });
    }

    // Bar / Bar% — horizontal bars, one row per direct child, sorted desc.
    const sorted = children
      .map((c) => ({ ...c, _v: Math.max(0, c.value ?? 0) }))
      .filter((c) => c._v > 0)
      .sort((a, b) => b._v - a._v);

    const n = sorted.length || 1;
    const total = sorted.reduce((s, c) => s + c._v, 0) || 1;
    const max = sorted[0]?._v ?? 1;
    const scaleDenom = view === "bar" ? max : total;

    const gap = 4;
    const barH = Math.max(22, Math.min(56, (size.h - gap) / n - gap));

    return sorted.map((c, i) => {
      const w = ((c._v) / scaleDenom) * (size.w - 1);
      return {
        code: c.code,
        name: c.name,
        value: c.value ?? 0,
        x: 0,
        y: i * (barH + gap),
        w: Math.max(1, w),
        h: barH,
        topCode: c.code,
        hasKids: !!c.children && c.children.length > 0,
        fitLabel: barH >= 22,
      };
    });
  }, [node, size, view]);

  const visibleTotal = useMemo(
    () => cells.reduce((acc, c) => acc + c.value, 0),
    [cells],
  );

  const color = useMemo(() => {
    const tops = (node.children && node.children.length > 0)
      ? node.children.map((c) => c.code)
      : [node.code];
    return scaleOrdinal<string, string>().domain(tops).range(PALETTE);
  }, [node]);

  // Resolve child node by code (for drill-down in bar views).
  const childByCode = useMemo(() => {
    const map = new Map<string, CompositionNode>();
    for (const c of node.children ?? []) map.set(c.code, c);
    return map;
  }, [node]);

  function fmtValue(v: number | null): string {
    if (v == null) return "—";
    return unitMode === "currency" ? formatTLCompact(v) : formatNumber(v);
  }

  const contentHeight = view === "tree"
    ? size.h
    : cells.reduce((m, c) => Math.max(m, c.y + c.h), 0) + 4;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={size.w}
        height={contentHeight}
        className="block"
        style={{ background: "#f3ece0" }}
      >
        {cells.map((c) => {
          const shareVis = visibleTotal ? c.value / visibleTotal : 0;
          const shareTot = rootTotal ? c.value / rootTotal : 0;
          const labelChars = Math.floor(c.w / 7);

          return (
            <g
              key={c.code}
              style={{
                transform: `translate(${c.x}px, ${c.y}px)`,
                transition: TRANSITION,
                cursor: c.hasKids ? "pointer" : "default",
              }}
              onClick={() => {
                if (!c.hasKids) return;
                const target = childByCode.get(c.code);
                if (target) onDrill(target);
              }}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left + 12,
                  y: e.clientY - rect.top + 12,
                  name: c.name,
                  value: c.value,
                  shareOfVisible: shareVis,
                  shareOfTotal: shareTot,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                fill={color(c.topCode)}
                stroke="#f3ece0"
                strokeWidth={1}
                style={{
                  width: c.w,
                  height: c.h,
                  transition: TRANSITION,
                }}
              />
              {c.fitLabel && (
                <>
                  <text
                    x={8}
                    y={view === "tree" ? 18 : Math.min(c.h - 8, c.h / 2 - 2)}
                    className="fill-ink"
                    style={{
                      font: "500 12px 'IBM Plex Mono', ui-monospace, monospace",
                      pointerEvents: "none",
                    }}
                  >
                    {truncate(c.name, Math.max(6, labelChars))}
                  </text>
                  <text
                    x={8}
                    y={view === "tree" ? 34 : Math.min(c.h - 2, c.h / 2 + 12)}
                    className="fill-ink"
                    style={{
                      font: "400 11px 'IBM Plex Mono', ui-monospace, monospace",
                      opacity: 0.75,
                      pointerEvents: "none",
                    }}
                  >
                    {formatPercent(shareVis)} · {fmtValue(c.value)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute rounded bg-ink/95 px-3 py-2 text-xs text-cream shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y, maxWidth: 260, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <div className="mb-1 font-serif text-sm text-cream">{tooltip.name}</div>
          <div>{fmtValue(tooltip.value)}</div>
          <div className="opacity-75">
            {formatPercent(tooltip.shareOfVisible)} (bu seviye) ·{" "}
            {formatPercent(tooltip.shareOfTotal)} (toplam)
          </div>
        </div>
      )}
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (max < 4) return "";
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
