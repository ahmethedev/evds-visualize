import type { SeriesPoint } from "./api";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeSlug(s: string) {
  return s
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "series";
}

export function exportCsv(
  points: SeriesPoint[],
  filename: string,
  valueHeader = "value",
) {
  const header = `date,${valueHeader}\n`;
  const body = points
    .map((p) => `${p.date},${p.value == null ? "" : p.value}`)
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${safeSlug(filename)}.csv`);
}

export async function exportSvgAsPng(
  svg: SVGSVGElement,
  filename: string,
  bgColor = "#f4ecd8",
  scale = 2,
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const bbox = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(bbox.width));
  const height = Math.max(1, Math.round(bbox.height));
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  inlineComputedStyles(svg, clone);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG could not be rasterized"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d context unavailable");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!blob) throw new Error("PNG encode failed");
    triggerDownload(blob, `${safeSlug(filename)}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function inlineComputedStyles(source: SVGSVGElement, target: SVGSVGElement): void {
  const sourceNodes = source.querySelectorAll<SVGElement>("*");
  const targetNodes = target.querySelectorAll<SVGElement>("*");
  const props = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-dasharray",
    "font-family",
    "font-size",
    "font-weight",
    "text-anchor",
    "opacity",
  ];
  for (let i = 0; i < sourceNodes.length && i < targetNodes.length; i++) {
    const cs = window.getComputedStyle(sourceNodes[i]);
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (v) targetNodes[i].setAttribute(p, v);
    }
  }
}
