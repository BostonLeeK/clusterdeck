import type { DiagramNode, DiagramSnapshot } from "@dataflow/shared";
import { nodeTypeById } from "@dataflow/shared";
import { cn } from "@/lib/utils";

type Box = { node: DiagramNode; x: number; y: number; width: number; height: number };

const NOMINAL_WIDTH = 560;
const NOMINAL_HEIGHT = 140;
const PADDING_RATIO = 0.06;
const MIN_LABEL_PX = 9;
const FONT = "Inter, system-ui, sans-serif";

const DEFAULT_SIZE: Record<DiagramNode["type"], { width: number; height: number }> = {
  infra: { width: 240, height: 96 },
  group: { width: 520, height: 280 },
  note: { width: 240, height: 120 },
  port: { width: 120, height: 32 },
};

function accentOf(node: DiagramNode) {
  if (node.data.kind === "infra") return node.data.accentColor ?? nodeTypeById(node.data.typeId)?.color ?? "#a1a1aa";
  if (node.data.kind === "group") return "#818cf8";
  return "#facc15";
}

function titleOf(node: DiagramNode) {
  return "title" in node.data ? (node.data.title ?? "").trim() : "";
}

function truncate(text: string, maxChars: number) {
  if (maxChars < 3) return "";
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}…` : text;
}

function layoutBoxes(snapshot: DiagramSnapshot): Box[] {
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const absolute = (node: DiagramNode) => {
    let { x, y } = node.position;
    let parent = node.parentId ? byId.get(node.parentId) : undefined;
    while (parent) {
      x += parent.position.x;
      y += parent.position.y;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
    return { x, y };
  };
  return snapshot.nodes
    .filter((node) => node.type !== "port")
    .map((node) => {
      const size = DEFAULT_SIZE[node.type] ?? DEFAULT_SIZE.infra;
      return {
        node,
        ...absolute(node),
        width: node.width ?? size.width,
        height: node.height ?? size.height,
      };
    });
}

function edgePath(source: Box, target: Box) {
  const forward = target.x >= source.x + source.width;
  const backward = source.x >= target.x + target.width;
  if (forward || backward) {
    const x1 = forward ? source.x + source.width : source.x;
    const x2 = forward ? target.x : target.x + target.width;
    const y1 = source.y + source.height / 2;
    const y2 = target.y + target.height / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  const below = target.y >= source.y;
  const x1 = source.x + source.width / 2;
  const x2 = target.x + target.width / 2;
  const y1 = below ? source.y + source.height : source.y;
  const y2 = below ? target.y : target.y + target.height;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

export function DiagramPreview({
  snapshot,
  className = "h-[132px]",
}: {
  snapshot: DiagramSnapshot;
  className?: string;
}) {
  const boxes = layoutBoxes(snapshot);
  if (!boxes.length) return <div className={cn("rounded-xl bg-surface", className)} />;

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const pad = Math.max(spanX, spanY) * PADDING_RATIO;
  const viewWidth = spanX + pad * 2;
  const viewHeight = spanY + pad * 2;
  const scale = Math.min(NOMINAL_WIDTH / viewWidth, NOMINAL_HEIGHT / viewHeight);
  const px = (value: number) => value / scale;

  const byId = new Map(boxes.map((box) => [box.node.id, box]));
  const groups = boxes.filter((box) => box.node.type === "group");
  const items = boxes.filter((box) => box.node.type !== "group");

  const label = (box: Box, fontPx: number, inset: number, offsetY: number, color: string) => {
    if (box.height * scale < MIN_LABEL_PX * 1.4) return null;
    const maxChars = Math.floor((box.width * scale - inset * 2) / (fontPx * 0.56));
    const text = truncate(titleOf(box.node), maxChars);
    if (!text) return null;
    return (
      <text x={box.x + px(inset)} y={box.y + px(offsetY)} fill={color} fontSize={px(fontPx)} fontFamily={FONT}>
        {text}
      </text>
    );
  };

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block w-full overflow-hidden", className)}
      aria-hidden
    >
      {groups.map((box) => (
        <g key={box.node.id}>
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            rx={px(6)}
            fill="rgba(129,140,248,0.04)"
            stroke="rgba(161,161,170,0.28)"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          {label(box, 8, 6, 12, "#a1a1aa")}
        </g>
      ))}
      {snapshot.edges.map((edge) => {
        const source = byId.get(edge.source);
        const target = byId.get(edge.target);
        if (!source || !target || source === target) return null;
        return (
          <path
            key={edge.id}
            d={edgePath(source, target)}
            fill="none"
            stroke="#52525b"
            strokeOpacity={0.8}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {items.map((box) => {
        const accent = accentOf(box.node);
        const note = box.node.type === "note";
        return (
          <g key={box.node.id}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={px(4)}
              fill={note ? "rgba(250,204,21,0.08)" : "#18181b"}
              stroke={note ? "rgba(250,204,21,0.3)" : accent}
              strokeOpacity={note ? 1 : 0.55}
              vectorEffect="non-scaling-stroke"
            />
            {!note ? (
              <rect x={box.x} y={box.y} width={px(2)} height={box.height} rx={px(1)} fill={accent} />
            ) : null}
            {label(box, MIN_LABEL_PX, 6, Math.min(14, (box.height * scale) / 2 + 3), "#e4e4e7")}
          </g>
        );
      })}
    </svg>
  );
}
