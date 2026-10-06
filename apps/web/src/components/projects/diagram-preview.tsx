import type { DiagramNode, DiagramSnapshot } from "@dataflow/shared";
import { nodeTypeById } from "@dataflow/shared";
import { cn } from "@/lib/utils";

type Box = { node: DiagramNode; x: number; y: number; width: number; height: number };

const TARGET_ASPECT = 4;
const NOMINAL_HEIGHT = 132;
const PADDING_RATIO = 0.08;
const LABEL_MIN_HEIGHT_PX = 22;
const LABEL_FONT_PX = 9;
const FONT = "Inter, system-ui, sans-serif";

const DEFAULT_SIZE: Record<DiagramNode["type"], { width: number; height: number }> = {
  infra: { width: 240, height: 96 },
  group: { width: 520, height: 280 },
  note: { width: 240, height: 120 },
  port: { width: 120, height: 32 },
};

function accentOf(node: DiagramNode) {
  if (node.data.kind === "infra") return node.data.accentColor ?? nodeTypeById(node.data.typeId)?.color ?? "#a1a1aa";
  if (node.data.kind === "note") return "#facc15";
  return "#a1a1aa";
}

function titleOf(node: DiagramNode) {
  return "title" in node.data ? (node.data.title ?? "").trim() : "";
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
      return { node, ...absolute(node), width: node.width ?? size.width, height: node.height ?? size.height };
    });
}

function frame(boxes: Box[]) {
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const pad = Math.max(maxX - minX, maxY - minY) * PADDING_RATIO;
  const spanX = maxX - minX + pad * 2;
  const spanY = maxY - minY + pad * 2;
  const fitWidth = Math.max(spanX, spanY * TARGET_ASPECT);
  const coverWidth = Math.min(spanX, spanY * TARGET_ASPECT);
  const width = Math.sqrt(fitWidth * coverWidth);
  const height = width / TARGET_ASPECT;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return { x: centerX - width / 2, y: centerY - height / 2, width, height, scale: NOMINAL_HEIGHT / height };
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

  const view = frame(boxes);
  const px = (value: number) => value / view.scale;
  const radius = (box: Box, max: number) => Math.min(px(max), box.height * 0.3);
  const byId = new Map(boxes.map((box) => [box.node.id, box]));
  const groups = boxes.filter((box) => box.node.type === "group");
  const items = boxes.filter((box) => box.node.type !== "group");

  const label = (box: Box) => {
    if (box.height * view.scale < LABEL_MIN_HEIGHT_PX) return null;
    const maxChars = Math.floor((box.width * view.scale - 16) / (LABEL_FONT_PX * 0.6));
    const title = titleOf(box.node);
    if (maxChars < 4 || !title) return null;
    const text = title.length > maxChars ? `${title.slice(0, maxChars - 1)}…` : title;
    return (
      <text
        x={box.x + px(8)}
        y={box.y + box.height / 2}
        dominantBaseline="central"
        fill="#e4e4e7"
        fontSize={px(LABEL_FONT_PX)}
        fontFamily={FONT}
      >
        {text}
      </text>
    );
  };

  return (
    <svg
      viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
      preserveAspectRatio="xMidYMid slice"
      className={cn("block w-full overflow-hidden", className)}
      aria-hidden
    >
      {groups.map((box) => (
        <rect
          key={box.node.id}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          rx={radius(box, 8)}
          fill="#ffffff"
          fillOpacity={0.025}
          stroke="#ffffff"
          strokeOpacity={0.08}
          vectorEffect="non-scaling-stroke"
        />
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
            stroke="#71717a"
            strokeOpacity={0.35}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      {items.map((box) => {
        const accent = accentOf(box.node);
        return (
          <g key={box.node.id}>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              rx={radius(box, 5)}
              fill={accent}
              fillOpacity={box.node.type === "note" ? 0.08 : 0.16}
              stroke={accent}
              strokeOpacity={0.35}
              vectorEffect="non-scaling-stroke"
            />
            {label(box)}
          </g>
        );
      })}
    </svg>
  );
}
