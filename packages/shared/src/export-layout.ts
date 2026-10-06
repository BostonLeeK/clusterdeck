import type { DiagramEdge, DiagramNode, DiagramNodeKind, DiagramSnapshot, EdgeLineShape, NodeShape } from "./node-types";
import { nodeTypeById, resolveAccentColor, resolveNodeScope, resolveNodeShape, techById } from "./node-types";

export type ExportShape = NodeShape | "group" | "note" | "port";

export interface ExportNode {
  id: string;
  parentId?: string;
  kind: DiagramNodeKind;
  shape: ExportShape;
  x: number;
  y: number;
  absX: number;
  absY: number;
  width: number;
  height: number;
  lines: string[];
  stroke: string;
  fill: string;
  dashed: boolean;
  opacity: number;
  align: "center" | "left";
  verticalAlign: "middle" | "top";
}

export interface ExportEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  lineShape: EdgeLineShape;
  dashed: boolean;
}

const DEFAULT_SIZE: Record<DiagramNodeKind, { width: number; height: number }> = {
  infra: { width: 200, height: 88 },
  group: { width: 520, height: 280 },
  note: { width: 240, height: 96 },
  port: { width: 160, height: 36 },
};

function sortParentsFirst(nodes: DiagramNode[]): DiagramNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = (node: DiagramNode) => {
    let value = 0;
    let parentId = node.parentId;
    const seen = new Set<string>();
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      value += 1;
      parentId = byId.get(parentId)?.parentId;
    }
    return value;
  };
  return [...nodes].sort((left, right) => depth(left) - depth(right));
}

function absoluteOrigin(node: DiagramNode, byId: Map<string, DiagramNode>): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let parentId = node.parentId;
  const seen = new Set<string>();
  while (parentId && byId.has(parentId) && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    parentId = parent.parentId;
  }
  return { x, y };
}

function linesOf(node: DiagramNode): string[] {
  if (node.data.kind === "infra") {
    const subtitle = node.data.subtitle ?? nodeTypeById(node.data.typeId)?.subtitle;
    const techs = (node.data.technologies ?? []).slice(0, 3).map((id) => techById(id)?.label ?? id);
    return [node.data.title, subtitle, node.data.displayDescription, techs.length ? techs.join(" · ") : undefined].filter(
      (line): line is string => Boolean(line?.trim()),
    );
  }
  if (node.data.kind === "group") {
    return [node.data.title, node.data.subtitle].filter((line): line is string => Boolean(line?.trim()));
  }
  if (node.data.kind === "note") {
    const title = node.data.title.trim() || (node.data.tone === "comment" ? "Comment" : "Text");
    const body = node.data.body?.trim();
    return body ? [title, body] : [title];
  }
  const prefix = node.data.direction === "in" ? "←" : "→";
  const protocol = node.data.protocol?.trim();
  return [`${prefix} ${node.data.title}${protocol ? ` · ${protocol}` : ""}`];
}

function boxSize(node: DiagramNode, lines: string[]): { width: number; height: number } {
  const fallback = DEFAULT_SIZE[node.type];
  const width = node.width && node.width > 0 ? node.width : fallback.width;
  if (node.height && node.height > 0) return { width, height: node.height };
  if (node.type === "infra") {
    return { width, height: fallback.height + Math.max(0, lines.length - 2) * 18 };
  }
  if (node.type === "note") {
    return { width, height: Math.min(220, fallback.height + Math.max(0, lines.length - 1) * 16) };
  }
  return { width, height: fallback.height };
}

function appearance(node: DiagramNode): Pick<ExportNode, "shape" | "stroke" | "fill" | "dashed" | "opacity" | "align" | "verticalAlign"> {
  if (node.data.kind === "infra") {
    const lifecycle = node.data.lifecycle ?? "live";
    return {
      shape: resolveNodeShape(node.data),
      stroke: resolveAccentColor(node.data),
      fill: "#ffffff",
      dashed: resolveNodeScope(node.data) === "external" || lifecycle === "future",
      opacity: lifecycle === "removed" ? 45 : lifecycle === "deprecated" ? 70 : 100,
      align: "center",
      verticalAlign: "middle",
    };
  }
  if (node.data.kind === "group") {
    return {
      shape: "group",
      stroke: "#d4d4d8",
      fill: "#f8fafc",
      dashed: false,
      opacity: 100,
      align: "left",
      verticalAlign: "top",
    };
  }
  if (node.data.kind === "note") {
    const comment = node.data.tone === "comment";
    return {
      shape: "note",
      stroke: comment ? "#f59e0b" : "#d4d4d8",
      fill: comment ? "#fffbeb" : "#ffffff",
      dashed: false,
      opacity: 100,
      align: "left",
      verticalAlign: "top",
    };
  }
  return {
    shape: "port",
    stroke: "#a1a1aa",
    fill: "#fafafa",
    dashed: true,
    opacity: 100,
    align: "center",
    verticalAlign: "middle",
  };
}

export function layoutDiagram(snapshot: DiagramSnapshot): { nodes: ExportNode[]; edges: ExportEdge[] } {
  const ordered = sortParentsFirst(snapshot.nodes);
  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const nodes = ordered.map((node) => {
    const lines = linesOf(node);
    const size = boxSize(node, lines);
    const origin = absoluteOrigin(node, byId);
    const parentId = node.parentId && byId.has(node.parentId) ? node.parentId : undefined;
    return {
      id: node.id,
      parentId,
      kind: node.type,
      x: node.position.x,
      y: node.position.y,
      absX: origin.x,
      absY: origin.y,
      width: size.width,
      height: size.height,
      lines,
      ...appearance(node),
    };
  });
  const exportedIds = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.flatMap((edge) => {
    if (!exportedIds.has(edge.source) || !exportedIds.has(edge.target)) return [];
    return [toExportEdge(edge)];
  });
  return { nodes, edges };
}

function toExportEdge(edge: DiagramEdge): ExportEdge {
  return {
    id: edge.id,
    sourceId: edge.source,
    targetId: edge.target,
    label: edge.label?.trim() || undefined,
    lineShape: edge.lineShape ?? "bezier",
    dashed: Boolean(edge.animated),
  };
}
