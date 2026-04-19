import { hierarchy, treemap } from "d3-hierarchy";
import { scaleOrdinal } from "d3-scale";
import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { CompositionNode } from "../lib/api";
import { formatPercent, formatTLCompact, formatNumber } from "../lib/format";

type Props = {
  node: CompositionNode;
  rootTotal: number;
  unitMode: "currency" | "index";
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

const PALETTE = [
  "#d9c5a0", "#c8a87c", "#a9c0a6", "#b8cfd6", "#c9b6c7",
  "#e0d0b3", "#b2b8c8", "#d4b5a0", "#a4b59a", "#c2a8b4",
  "#bdb09a", "#9fb1bf", "#cbbfa4",
];

export default function Treemap({ node, rootTotal, unitMode, onDrill }: Props) {
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

  const leaves = useMemo(() => {
    const children = (node.children && node.children.length > 0)
      ? node.children
      : [{ ...node, children: [] }];

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

    return root.leaves();
  }, [node, size]);

  const visibleTotal = useMemo(
    () => leaves.reduce((acc, l) => acc + (l.value ?? 0), 0),
    [leaves],
  );

  const color = useMemo(() => {
    const tops = (node.children && node.children.length > 0)
      ? node.children.map((c) => c.code)
      : [node.code];
    return scaleOrdinal<string, string>().domain(tops).range(PALETTE);
  }, [node]);

  function topAncestorCode(leaf: any): string {
    let cur = leaf;
    while (cur.parent && cur.parent.parent) cur = cur.parent;
    return (cur.data as CompositionNode).code;
  }

  function fmtValue(v: number | null): string {
    if (v == null) return "—";
    return unitMode === "currency" ? formatTLCompact(v) : formatNumber(v);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={size.w}
        height={size.h}
        className="block"
        style={{ background: "#f3ece0" }}
      >
        {leaves.map((leaf: any) => {
          const d = leaf.data as CompositionNode;
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const val = leaf.value ?? 0;
          const shareVis = visibleTotal ? val / visibleTotal : 0;
          const shareTot = rootTotal ? val / rootTotal : 0;
          const hasKids = d.children && d.children.length > 0;
          const canFitLabel = w > 60 && h > 28;

          return (
            <g
              key={d.code}
              transform={`translate(${leaf.x0},${leaf.y0})`}
              style={{ cursor: hasKids ? "pointer" : "default" }}
              onClick={() => hasKids && onDrill(d)}
              onMouseMove={(e) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left + 12,
                  y: e.clientY - rect.top + 12,
                  name: d.name,
                  value: val,
                  shareOfVisible: shareVis,
                  shareOfTotal: shareTot,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <rect
                width={w}
                height={h}
                fill={color(topAncestorCode(leaf))}
                stroke="#f3ece0"
                strokeWidth={1}
              />
              {canFitLabel && (
                <>
                  <text
                    x={8}
                    y={18}
                    className="fill-ink"
                    style={{
                      font: "500 12px 'IBM Plex Mono', ui-monospace, monospace",
                      pointerEvents: "none",
                    }}
                  >
                    <tspan>{truncate(d.name, Math.floor(w / 7))}</tspan>
                  </text>
                  <text
                    x={8}
                    y={34}
                    className="fill-ink"
                    style={{
                      font: "400 11px 'IBM Plex Mono', ui-monospace, monospace",
                      opacity: 0.75,
                      pointerEvents: "none",
                    }}
                  >
                    {formatPercent(shareVis)} · {fmtValue(val)}
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
