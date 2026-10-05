import type { DiagramNode, DiagramSnapshot } from "@dataflow/shared";
import { nodeTypeById } from "@dataflow/shared";

function titleOf(node: DiagramNode) {
  return node.data.kind === "port" ? node.data.title : node.data.title;
}

function subtitleOf(node: DiagramNode) {
  if (node.data.kind === "infra") return node.data.subtitle ?? nodeTypeById(node.data.typeId)?.subtitle ?? "";
  if (node.data.kind === "group") return node.data.subtitle ?? "";
  return "";
}

function colorOf(node: DiagramNode) {
  if (node.data.kind === "infra") {
    return node.data.accentColor ?? nodeTypeById(node.data.typeId)?.color ?? "#a1a1aa";
  }
  return "#818cf8";
}

function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function DiagramPreview({ snapshot }: { snapshot: DiagramSnapshot }) {
  const nodes = snapshot.nodes.filter((node) => node.type !== "port").slice(0, 10);
  if (nodes.length === 0) {
    return <div className="h-[132px] rounded-xl bg-surface" />;
  }

  const ids = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  const incoming = new Set(edges.map((edge) => edge.target));
  const roots = nodes.filter((node) => !incoming.has(node.id));
  const start = roots[0] ?? nodes[0];
  if (!start) return <div className="h-[132px] rounded-xl bg-surface" />;

  const columns: DiagramNode[][] = [];
  const seen = new Set<string>();
  let frontier = [start];
  for (const extra of roots.slice(1)) frontier.push(extra);
  while (frontier.length && columns.length < 3) {
    const col = frontier.filter((node) => !seen.has(node.id)).slice(0, 4);
    col.forEach((node) => seen.add(node.id));
    if (col.length) columns.push(col);
    const next: DiagramNode[] = [];
    for (const node of col) {
      for (const edge of edges) {
        if (edge.source !== node.id || seen.has(edge.target)) continue;
        const target = nodes.find((item) => item.id === edge.target);
        if (target) next.push(target);
      }
    }
    frontier = next;
  }
  for (const node of nodes) {
    if (!seen.has(node.id) && columns.length && (columns.at(-1)?.length ?? 0) < 4) {
      columns.at(-1)?.push(node);
      seen.add(node.id);
    }
  }

  const colW = 118;
  const rowH = 34;
  const padX = 8;
  const padY = 10;
  const height = 132;
  const width = columns.length * colW + padX * 2;
  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((col, ci) => {
    const total = col.length * rowH;
    const startY = padY + Math.max(0, (height - padY * 2 - total) / 2);
    col.forEach((node, ri) => {
      positions.set(node.id, { x: padX + ci * colW, y: startY + ri * rowH });
    });
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[132px] w-full overflow-visible">
      {edges.map((edge) => {
        const a = positions.get(edge.source);
        const b = positions.get(edge.target);
        if (!a || !b) return null;
        const x1 = a.x + 86;
        const y1 = a.y + 12;
        const x2 = b.x;
        const y2 = b.y + 12;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1.2"
          />
        );
      })}
      {Array.from(positions.entries()).map(([id, pos]) => {
        const node = nodes.find((item) => item.id === id);
        if (!node) return null;
        const color = colorOf(node);
        return (
          <g key={id} transform={`translate(${pos.x},${pos.y})`}>
            <rect width="88" height="24" rx="8" fill={withAlpha(color, 0.14)} stroke={withAlpha(color, 0.35)} />
            <circle cx="11" cy="12" r="3.2" fill={color} />
            <text x="20" y="11" fill="#f4f4f5" fontSize="8" fontFamily="Inter, system-ui">
              {titleOf(node).slice(0, 14)}
            </text>
            <text x="20" y="19" fill="#a1a1aa" fontSize="6.5" fontFamily="Inter, system-ui">
              {subtitleOf(node).slice(0, 16)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
