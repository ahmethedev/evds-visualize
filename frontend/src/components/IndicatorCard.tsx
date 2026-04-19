import { Link } from "react-router";
import type { Indicator } from "../lib/api";
import { formatDateTR } from "../lib/format";
import Sparkline from "./Sparkline";

const VALUE_FMT = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });
const COMPACT_FMT = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const PP_FMT = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

function formatValue(ind: Indicator): string {
  if (ind.value == null) return "—";
  if (ind.unit === "%") return `${VALUE_FMT.format(ind.value)}%`;
  if (ind.unit === "TL" || ind.unit === "TL/gr") return `${VALUE_FMT.format(ind.value)} ${ind.unit}`;
  if (ind.unit === "Milyon USD") return `${COMPACT_FMT.format(ind.value * 1_000_000)} USD`;
  return `${VALUE_FMT.format(ind.value)} ${ind.unit}`;
}

type Delta = { label: string; text: string; positive: boolean | null };

function buildDeltas(ind: Indicator): Delta[] {
  const out: Delta[] = [];
  if (ind.transform === "yoy_pct") {
    if (ind.change_mom != null) out.push(deltaPP("Aylık", ind.change_mom));
    if (ind.change_yoy != null) out.push(deltaPP("Yıllık", ind.change_yoy));
  } else {
    if (ind.change_mom_pct != null) out.push(deltaPct("Aylık", ind.change_mom_pct));
    if (ind.change_yoy_pct != null) out.push(deltaPct("Yıllık", ind.change_yoy_pct));
  }
  return out;
}

function deltaPct(label: string, pct: number): Delta {
  const text = `${PP_FMT.format(pct)}%`;
  const positive = Math.abs(pct) < 0.05 ? null : pct > 0;
  return { label, text, positive };
}

function deltaPP(label: string, pp: number): Delta {
  const text = `${PP_FMT.format(pp)} pp`;
  const positive = Math.abs(pp) < 0.05 ? null : pp > 0;
  return { label, text, positive };
}

function deltaColor(d: Delta): string {
  if (d.positive == null) return "text-ink/50";
  return d.positive ? "text-emerald-700" : "text-rose-700";
}

export default function IndicatorCard({ ind }: { ind: Indicator }) {
  const deltas = buildDeltas(ind);
  const trendUp = ind.transform === "yoy_pct" ? (ind.change_mom ?? 0) >= 0 : (ind.change_mom_pct ?? 0) >= 0;
  const sparkColor = trendUp ? "#047857" : "#be123c";

  return (
    <Link
      to={`/map/${ind.datagroup}`}
      className="group flex flex-col justify-between rounded-md border border-ink/15 bg-white/40 p-4 transition hover:border-ink/50 hover:bg-white/70"
    >
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-60">{ind.label}</div>
        <div className="mt-1 font-serif text-3xl leading-none">{formatValue(ind)}</div>
        <div className="mt-1 text-[10px] opacity-50">{formatDateTR(ind.asof)}</div>
      </div>

      <div className="mt-3">
        <Sparkline
          points={ind.sparkline}
          width={220}
          height={32}
          stroke={sparkColor}
          fill={`${sparkColor}14`}
          className="w-full"
        />
      </div>

      <div className="mt-2 flex gap-3 text-[11px]">
        {deltas.length === 0 && <span className="opacity-40">—</span>}
        {deltas.map((d) => (
          <span key={d.label} className={deltaColor(d)}>
            <span className="opacity-60">{d.label}:</span> {d.text}
          </span>
        ))}
      </div>
    </Link>
  );
}
