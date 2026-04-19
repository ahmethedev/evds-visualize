import type { IndicatorSparkPoint } from "../lib/api";

type Props = {
  points: IndicatorSparkPoint[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
};

export default function Sparkline({
  points,
  width = 160,
  height = 36,
  stroke = "currentColor",
  fill = "none",
  className,
}: Props) {
  if (points.length < 2) {
    return <svg className={className} width={width} height={height} />;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * w;
    const y = pad + h - ((p.value - min) / span) * h;
    return [x, y] as const;
  });

  const path = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    coords.length > 0
      ? `${path} L${coords[coords.length - 1][0].toFixed(1)},${(pad + h).toFixed(1)} L${coords[0][0].toFixed(1)},${(pad + h).toFixed(1)} Z`
      : "";

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      {fill !== "none" && <path d={areaPath} fill={fill} stroke="none" />}
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
