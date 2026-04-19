import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { scaleLinear, scaleTime } from "d3-scale";
import type { SeriesPoint } from "../lib/api";

function extent<T>(xs: T[], fn: (x: T) => number | Date): [number, number] | [Date, Date] {
  let min: any = undefined;
  let max: any = undefined;
  for (const v of xs) {
    const n = fn(v);
    if (min === undefined || n < min) min = n;
    if (max === undefined || n > max) max = n;
  }
  return [min, max];
}

function nearestIndex(arr: { date: Date }[], target: Date): number {
  let lo = 0;
  let hi = arr.length - 1;
  const t = target.getTime();
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].date.getTime() < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0) {
    const prev = arr[lo - 1].date.getTime();
    const cur = arr[lo].date.getTime();
    if (Math.abs(prev - t) < Math.abs(cur - t)) return lo - 1;
  }
  return lo;
}
import { formatNumber } from "../lib/format";

type Props = {
  points: SeriesPoint[];
  label?: string;
};

type Hover = { i: number; x: number; y: number } | null;

const MARGIN = { top: 16, right: 24, bottom: 28, left: 56 };

export default function SeriesChart({ points, label }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 640, h: 320 });
  const [hover, setHover] = useState<Hover>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize({ w: Math.max(280, width), h: Math.max(220, height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const parsed = useMemo(
    () =>
      points
        .map((p) => ({ date: new Date(p.date), value: p.value }))
        .filter((p) => !Number.isNaN(p.date.getTime()) && p.value != null)
        .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [points],
  );

  const { innerW, innerH, xScale, yScale, path } = useMemo(() => {
    const innerW = Math.max(10, size.w - MARGIN.left - MARGIN.right);
    const innerH = Math.max(10, size.h - MARGIN.top - MARGIN.bottom);
    if (parsed.length === 0) {
      return { innerW, innerH, xScale: null, yScale: null, path: "" };
    }
    const [x0, x1] = extent(parsed, (d) => d.date) as [Date, Date];
    const [y0, y1] = extent(parsed, (d) => d.value) as [number, number];
    const pad = (y1 - y0) * 0.05 || 1;
    const xScale = scaleTime().domain([x0, x1]).range([0, innerW]);
    const yScale = scaleLinear().domain([y0 - pad, y1 + pad]).nice().range([innerH, 0]);
    const path = parsed
      .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.date)},${yScale(d.value)}`)
      .join("");
    return { innerW, innerH, xScale, yScale, path };
  }, [parsed, size]);

  const onMove = (evt: React.MouseEvent<SVGRectElement>) => {
    if (!xScale || parsed.length === 0) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const date = xScale.invert(x);
    const idx = nearestIndex(parsed, date);
    const p = parsed[idx];
    setHover({ i: idx, x: xScale(p.date), y: yScale!(p.value) });
  };

  if (parsed.length === 0) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center text-sm text-ink/50"
      >
        Veri yok
      </div>
    );
  }

  const yTicks = yScale!.ticks(5);
  const xTicks = xScale!.ticks(6);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg width={size.w} height={size.h} className="overflow-visible">
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {yTicks.map((t) => (
            <g key={`y${t}`} transform={`translate(0,${yScale!(t)})`}>
              <line x1={0} x2={innerW} className="stroke-ink/10" />
              <text x={-8} dy="0.32em" textAnchor="end" className="fill-ink/60 text-[10px] font-mono">
                {formatNumber(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={`x${t.getTime()}`} transform={`translate(${xScale!(t)},${innerH})`}>
              <line y1={0} y2={4} className="stroke-ink/40" />
              <text y={16} textAnchor="middle" className="fill-ink/60 text-[10px] font-mono">
                {t.toLocaleDateString("tr-TR", { year: "2-digit", month: "short" })}
              </text>
            </g>
          ))}
          <path d={path} fill="none" className="stroke-ink" strokeWidth={1.5} />
          {hover && (
            <>
              <line
                x1={hover.x}
                x2={hover.x}
                y1={0}
                y2={innerH}
                className="stroke-ink/40"
                strokeDasharray="3 3"
              />
              <circle cx={hover.x} cy={hover.y} r={4} className="fill-ink" />
            </>
          )}
          <rect
            x={0}
            y={0}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
          />
        </g>
      </svg>
      {hover && parsed[hover.i] && (
        <div
          className="pointer-events-none absolute rounded border border-ink/20 bg-cream px-2 py-1 font-mono text-[11px] shadow"
          style={{
            left: Math.min(hover.x + MARGIN.left + 12, size.w - 160),
            top: hover.y + MARGIN.top - 8,
          }}
        >
          <div className="font-semibold">
            {parsed[hover.i].date.toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="text-ink/70">
            {label ? `${label}: ` : ""}
            {formatNumber(parsed[hover.i].value)}
          </div>
        </div>
      )}
    </div>
  );
}
