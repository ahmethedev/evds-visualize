import type { SeriesPoint } from "./api";

export type RangeKey = "1y" | "5y" | "10y" | "all";
export type FreqKey = "native" | "monthly" | "yearly";
export type TransformKey = "none" | "yoy_pct" | "ma3" | "ma12";

export const RANGE_LABELS: Record<RangeKey, string> = {
  "1y": "1Y",
  "5y": "5Y",
  "10y": "10Y",
  all: "Tümü",
};

export const FREQ_LABELS: Record<FreqKey, string> = {
  native: "Ham",
  monthly: "Aylık",
  yearly: "Yıllık",
};

export const TRANSFORM_LABELS: Record<TransformKey, string> = {
  none: "Değer",
  yoy_pct: "YoY %",
  ma3: "MA 3",
  ma12: "MA 12",
};

const DAY = 86_400_000;

export function resample(points: SeriesPoint[], freq: FreqKey): SeriesPoint[] {
  if (freq === "native" || points.length === 0) return points;
  const buckets = new Map<string, { sum: number; n: number; lastDate: string }>();
  for (const p of points) {
    if (p.value == null) continue;
    const d = new Date(p.date);
    if (Number.isNaN(d.getTime())) continue;
    const key =
      freq === "monthly"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : String(d.getFullYear());
    const b = buckets.get(key);
    if (!b) buckets.set(key, { sum: p.value, n: 1, lastDate: p.date });
    else {
      b.sum += p.value;
      b.n += 1;
      if (p.date > b.lastDate) b.lastDate = p.date;
    }
  }
  return Array.from(buckets.values())
    .map((b) => ({ date: b.lastDate, value: b.sum / b.n }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function applyTransform(points: SeriesPoint[], t: TransformKey): SeriesPoint[] {
  if (t === "none" || points.length === 0) return points;
  if (t === "ma3" || t === "ma12") {
    const window = t === "ma3" ? 3 : 12;
    if (points.length < window) return [];
    const out: SeriesPoint[] = [];
    for (let i = window - 1; i < points.length; i++) {
      let sum = 0;
      let n = 0;
      for (let j = i - window + 1; j <= i; j++) {
        const v = points[j].value;
        if (v != null) {
          sum += v;
          n += 1;
        }
      }
      if (n === window) out.push({ date: points[i].date, value: sum / n });
    }
    return out;
  }
  if (t === "yoy_pct") {
    const times = points.map((p) => new Date(p.date).getTime());
    const out: SeriesPoint[] = [];
    let j = 0;
    for (let i = 0; i < points.length; i++) {
      const target = times[i] - 365.25 * DAY;
      if (target < times[0]) continue;
      while (j + 1 < i && times[j + 1] <= target) j++;
      let best = j;
      if (j + 1 < i && Math.abs(times[j + 1] - target) < Math.abs(times[j] - target)) {
        best = j + 1;
      }
      if (Math.abs(times[best] - target) > 45 * DAY) continue;
      const prev = points[best].value;
      const cur = points[i].value;
      if (prev == null || cur == null || prev === 0) continue;
      out.push({ date: points[i].date, value: ((cur - prev) / Math.abs(prev)) * 100 });
    }
    return out;
  }
  return points;
}

export function applyRange(points: SeriesPoint[], range: RangeKey): SeriesPoint[] {
  if (range === "all" || points.length === 0) return points;
  const years = range === "1y" ? 1 : range === "5y" ? 5 : 10;
  const lastIso = points[points.length - 1].date;
  const last = new Date(lastIso);
  if (Number.isNaN(last.getTime())) return points;
  const cutoff = new Date(last);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return points.filter((p) => p.date >= cutoffIso);
}
