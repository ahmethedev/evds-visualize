const TRY_COMPACT = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const TRY_FULL = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 0,
});

const PCT = new Intl.NumberFormat("tr-TR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const DECIMAL = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
});

export function formatTLCompact(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${TRY_COMPACT.format(v)} TL`;
}

export function formatTLFull(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${TRY_FULL.format(v)} TL`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null) return "—";
  return DECIMAL.format(v);
}

export function formatPercent(ratio: number): string {
  return PCT.format(ratio);
}

export function formatDateTR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}
