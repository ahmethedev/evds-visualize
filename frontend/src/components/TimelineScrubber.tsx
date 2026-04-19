import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { TimelinePoint } from "../lib/api";
import { formatDateTR } from "../lib/format";

type Props = {
  points: TimelinePoint[];
  selectedDate: string | null;
  onChange: (date: string) => void;
};

const PADDING_X = 12;
const HEIGHT = 80;
const PLOT_TOP = 18;
const PLOT_BOTTOM = HEIGHT - 22;

export default function TimelineScrubber({ points, selectedDate, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, e.contentRect.width));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const sorted = useMemo(
    () =>
      [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [points],
  );

  const selectedIdx = useMemo(() => {
    if (!selectedDate || sorted.length === 0) return sorted.length - 1;
    let bestI = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const diff = Math.abs(
        new Date(sorted[i].date).getTime() - new Date(selectedDate).getTime(),
      );
      if (diff < bestDiff) {
        bestDiff = diff;
        bestI = i;
      }
    }
    return bestI;
  }, [sorted, selectedDate]);

  const geometry = useMemo(() => {
    if (sorted.length < 2) return null;
    const xs = sorted.map((p) => new Date(p.date).getTime());
    const xMin = xs[0];
    const xMax = xs[xs.length - 1];
    const yMin = Math.min(...sorted.map((p) => p.total));
    const yMax = Math.max(...sorted.map((p) => p.total));
    const xSpan = xMax - xMin || 1;
    const ySpan = yMax - yMin || 1;
    const plotW = width - PADDING_X * 2;

    const xAt = (t: number) => PADDING_X + ((t - xMin) / xSpan) * plotW;
    const yAt = (v: number) =>
      PLOT_BOTTOM - ((v - yMin) / ySpan) * (PLOT_BOTTOM - PLOT_TOP);

    const path = sorted
      .map((p, i) => {
        const x = xAt(new Date(p.date).getTime());
        const y = yAt(p.total);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const area =
      `${path} L${xAt(xMax).toFixed(1)},${PLOT_BOTTOM} ` +
      `L${xAt(xMin).toFixed(1)},${PLOT_BOTTOM} Z`;

    return { xAt, yAt, xMin, xMax, path, area };
  }, [sorted, width]);

  function pickFromPointerX(clientX: number) {
    if (!geometry || !containerRef.current || sorted.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const t = ((localX - PADDING_X) / (width - PADDING_X * 2)) *
      (geometry.xMax - geometry.xMin) + geometry.xMin;
    let bestI = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const diff = Math.abs(new Date(sorted[i].date).getTime() - t);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestI = i;
      }
    }
    onChange(sorted[bestI].date);
  }

  const dragging = useRef(false);

  if (sorted.length === 0) {
    return (
      <div className="text-xs opacity-60">Zaman serisi verisi yok.</div>
    );
  }

  const current = sorted[selectedIdx];
  const markerX = geometry ? geometry.xAt(new Date(current.date).getTime()) : 0;
  const markerY = geometry ? geometry.yAt(current.total) : 0;

  return (
    <div className="select-none">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="opacity-60">Zaman</span>
        <span className="font-mono">
          {formatDateTR(current.date)}
        </span>
      </div>
      <div
        ref={containerRef}
        className="relative w-full cursor-pointer"
        style={{ height: HEIGHT }}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          pickFromPointerX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) pickFromPointerX(e.clientX);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          (e.target as Element).releasePointerCapture?.(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" && selectedIdx > 0) {
            e.preventDefault();
            onChange(sorted[selectedIdx - 1].date);
          } else if (e.key === "ArrowRight" && selectedIdx < sorted.length - 1) {
            e.preventDefault();
            onChange(sorted[selectedIdx + 1].date);
          }
        }}
        tabIndex={0}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={sorted.length - 1}
        aria-valuenow={selectedIdx}
        aria-valuetext={current.date}
      >
        <svg
          width={width}
          height={HEIGHT}
          className="block"
          style={{ background: "#efe6d4" }}
        >
          {geometry && (
            <>
              <path d={geometry.area} fill="#d9c5a0" opacity={0.55} />
              <path
                d={geometry.path}
                fill="none"
                stroke="#5a4a32"
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1={markerX}
                x2={markerX}
                y1={PLOT_TOP - 4}
                y2={PLOT_BOTTOM + 4}
                stroke="#1a1a1a"
                strokeWidth={1}
              />
              <circle cx={markerX} cy={markerY} r={4} fill="#1a1a1a" />
            </>
          )}
          <text
            x={PADDING_X}
            y={HEIGHT - 4}
            style={{ font: "400 10px 'IBM Plex Mono', monospace", opacity: 0.55 }}
          >
            {sorted[0].date}
          </text>
          <text
            x={width - PADDING_X}
            y={HEIGHT - 4}
            textAnchor="end"
            style={{ font: "400 10px 'IBM Plex Mono', monospace", opacity: 0.55 }}
          >
            {sorted[sorted.length - 1].date}
          </text>
        </svg>
      </div>
    </div>
  );
}
