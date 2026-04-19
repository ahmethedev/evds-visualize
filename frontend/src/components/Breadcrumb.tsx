import type { CompositionNode } from "../lib/api";

type Props = {
  trail: CompositionNode[];
  onSelect: (index: number) => void;
};

export default function Breadcrumb({ trail, onSelect }: Props) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Breadcrumb">
      {trail.map((n, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={n.code} className="flex items-center gap-1">
            {i > 0 && <span className="opacity-40">›</span>}
            {isLast ? (
              <span className="font-serif">{n.name}</span>
            ) : (
              <button
                type="button"
                className="underline decoration-dotted underline-offset-4 hover:opacity-80"
                onClick={() => onSelect(i)}
              >
                {n.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
