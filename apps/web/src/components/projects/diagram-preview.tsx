import type { LucideIcon } from "lucide-react";
import type { DiagramSnapshot, InfraNodeData } from "@dataflow/shared";
import { nodeTypeById, parseConnectorHandle } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

type PreviewNode = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  Icon: LucideIcon;
};

type Placed = PreviewNode & { x: number; y: number };

const MAX_PER_COLUMN = 3;
const ENTRY_SIZE = 22;
const ENTRY_COLUMN_WIDTH = 44;
const CARD_WIDTH = 96;
const CARD_HEIGHT = 24;
const ROW_GAP = 8;
const COLUMN_GAP = 44;
const PADDING = 8;
const MIN_HEIGHT = 72;
const FONT = "Inter, system-ui, sans-serif";

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function toPreviewNode(id: string, data: InfraNodeData): PreviewNode {
  const meta = nodeTypeById(data.typeId);
  return {
    id,
    title: data.title.trim() || meta?.label || "Untitled",
    subtitle: data.subtitle?.trim() || meta?.subtitle || meta?.label || "",
    color: data.accentColor ?? meta?.color ?? "#a1a1aa",
    Icon: NODE_ICONS[data.typeId] ?? NODE_ICONS.service,
  };
}

function buildGraph(snapshot: DiagramSnapshot) {
  const nodes = new Map<string, PreviewNode>();
  for (const node of snapshot.nodes) {
    if (node.data.kind === "infra") nodes.set(node.id, toPreviewNode(node.id, node.data));
  }
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  const resolve = (nodeId: string, handle: string | null | undefined) => {
    const connector = parseConnectorHandle(handle);
    return connector && nodes.has(connector.nodeId) ? connector.nodeId : nodeId;
  };
  for (const edge of snapshot.edges) {
    const source = resolve(edge.source, edge.sourceHandle);
    const target = resolve(edge.target, edge.targetHandle);
    if (source === target || !nodes.has(source) || !nodes.has(target)) continue;
    if (!outgoing.has(source)) outgoing.set(source, new Set());
    if (!incoming.has(target)) incoming.set(target, new Set());
    outgoing.get(source)!.add(target);
    incoming.get(target)!.add(source);
  }
  const out = (id: string) => [...(outgoing.get(id) ?? [])];
  const into = (id: string) => [...(incoming.get(id) ?? [])];
  const linked = (a: string, b: string) => Boolean(outgoing.get(a)?.has(b) || outgoing.get(b)?.has(a));
  return { nodes, out, into, linked };
}

function pickColumns(snapshot: DiagramSnapshot) {
  const { nodes, out, into, linked } = buildGraph(snapshot);
  const ids = [...nodes.keys()];
  if (!ids.length) return { columns: [] as PreviewNode[][], linked };

  const degree = (id: string) => out(id).length + into(id).length;
  const sources = ids.filter((id) => into(id).length === 0 && out(id).length > 0);
  const center =
    [...(sources.length ? sources : ids)].sort((a, b) => out(b).length - out(a).length || degree(b) - degree(a))[0] ??
    ids[0]!;

  const neighbors = (id: string) => (out(id).length ? out(id) : into(id));
  const seen = new Set([center]);
  const take = (candidates: string[]) => {
    const picked: string[] = [];
    for (const id of candidates) {
      if (picked.length >= MAX_PER_COLUMN || seen.has(id)) continue;
      seen.add(id);
      picked.push(id);
    }
    return picked;
  };

  const second = take(neighbors(center));
  if (!second.length) {
    return { columns: [ids.slice(0, MAX_PER_COLUMN).map((id) => nodes.get(id)!)], linked };
  }
  const third = take(second.flatMap(neighbors));
  const columns = [[center], second, third]
    .filter((column) => column.length)
    .map((column) => column.map((id) => nodes.get(id)!));
  return { columns, linked };
}

function columnTop(count: number, height: number, itemHeight: number) {
  const total = count * itemHeight + (count - 1) * ROW_GAP;
  return (height - total) / 2;
}

export function DiagramPreview({
  snapshot,
  className = "h-[132px]",
}: {
  snapshot: DiagramSnapshot;
  className?: string;
}) {
  const { columns, linked } = pickColumns(snapshot);
  if (!columns.length) return <div className={cn("rounded-xl bg-surface", className)} />;

  const hasEntry = columns.length > 1;
  const tallest = Math.max(...columns.map((column) => column.length * CARD_HEIGHT + (column.length - 1) * ROW_GAP));
  const height = Math.max(MIN_HEIGHT, tallest + PADDING * 2);
  const columnX = (index: number) =>
    !hasEntry || index === 0
      ? PADDING
      : PADDING + ENTRY_COLUMN_WIDTH + COLUMN_GAP + (index - 1) * (CARD_WIDTH + COLUMN_GAP);
  const width = columnX(columns.length - 1) + CARD_WIDTH + PADDING;

  const placed: Placed[][] = columns.map((column, index) => {
    const itemHeight = hasEntry && index === 0 ? ENTRY_SIZE : CARD_HEIGHT;
    const top = columnTop(column.length, height, itemHeight);
    return column.map((node, row) => ({ ...node, x: columnX(index), y: top + row * (itemHeight + ROW_GAP) }));
  });

  const links: { id: string; d: string }[] = [];
  placed.forEach((column, index) => {
    const next = placed[index + 1];
    if (!next) return;
    const isEntry = hasEntry && index === 0;
    for (const source of column) {
      const x1 = isEntry ? source.x + (ENTRY_COLUMN_WIDTH + ENTRY_SIZE) / 2 : source.x + CARD_WIDTH;
      const y1 = source.y + (isEntry ? ENTRY_SIZE : CARD_HEIGHT) / 2;
      for (const target of next) {
        if (!linked(source.id, target.id)) continue;
        const x2 = target.x;
        const y2 = target.y + CARD_HEIGHT / 2;
        const mx = (x1 + x2) / 2;
        links.push({ id: `${source.id}-${target.id}`, d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
      }
    }
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block w-full overflow-hidden", className)}
      aria-hidden
    >
      {links.map((link) => (
        <path key={link.id} d={link.d} fill="none" stroke="#3f3f46" strokeWidth={0.8} />
      ))}
      {placed.map((column, index) =>
        column.map((node) =>
          hasEntry && index === 0 ? (
            <EntryNode key={node.id} node={node} />
          ) : (
            <CardNode key={node.id} node={node} />
          ),
        ),
      )}
    </svg>
  );
}

function EntryNode({ node }: { node: Placed }) {
  const left = node.x + (ENTRY_COLUMN_WIDTH - ENTRY_SIZE) / 2;
  return (
    <g>
      <rect x={left} y={node.y} width={ENTRY_SIZE} height={ENTRY_SIZE} rx={6} fill="#18181b" stroke="#27272a" strokeWidth={0.6} />
      <node.Icon x={left + 5.5} y={node.y + 5.5} width={11} height={11} color="#d4d4d8" strokeWidth={1.6} />
      <text
        x={node.x + ENTRY_COLUMN_WIDTH / 2}
        y={node.y + ENTRY_SIZE + 8}
        textAnchor="middle"
        fill="#a1a1aa"
        fontSize={6.5}
        fontFamily={FONT}
      >
        {truncate(node.title, 12)}
      </text>
    </g>
  );
}

function CardNode({ node }: { node: Placed }) {
  return (
    <g>
      <rect x={node.x} y={node.y} width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} fill="#18181b" stroke="#27272a" strokeWidth={0.6} />
      <node.Icon x={node.x + 7} y={node.y + 7} width={10} height={10} color={node.color} strokeWidth={1.8} />
      <text x={node.x + 22} y={node.y + 10.5} fill="#f4f4f5" fontSize={7} fontWeight={500} fontFamily={FONT}>
        {truncate(node.title, 18)}
      </text>
      <text x={node.x + 22} y={node.y + 18.5} fill="#71717a" fontSize={5.5} fontFamily={FONT}>
        {truncate(node.subtitle, 24)}
      </text>
    </g>
  );
}
