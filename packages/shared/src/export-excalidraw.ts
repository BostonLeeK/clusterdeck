import type { DiagramSnapshot } from "./node-types";
import type { ExportEdge, ExportNode } from "./export-layout";
import { layoutDiagram } from "./export-layout";

const FONT_SIZE = 14;
const LINE_HEIGHT = 1.25;

interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: "solid";
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  roughness: number;
  opacity: number;
  groupIds: string[];
  frameId: null;
  index: string;
  roundness: { type: 3 } | null;
  seed: number;
  version: number;
  versionNonce: number;
  isDeleted: false;
  boundElements: Array<{ id: string; type: "text" | "arrow" }> | null;
  updated: number;
  link: null;
  locked: false;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "center" | "left";
  verticalAlign?: "middle" | "top";
  containerId?: string | null;
  originalText?: string;
  autoResize?: boolean;
  lineHeight?: number;
  points?: Array<[number, number]>;
  lastCommittedPoint?: null;
  startBinding?: { elementId: string; fixedPoint: [number, number]; mode: "orbit" } | null;
  endBinding?: { elementId: string; fixedPoint: [number, number]; mode: "orbit" } | null;
  startArrowhead?: null;
  endArrowhead?: "arrow" | null;
  elbowed?: false;
}

function seedFrom(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash % 2147483646 || 1;
}

function indexKey(order: number): string {
  return `a${order.toString(36).padStart(6, "0")}`;
}

function shapeType(node: ExportNode): "rectangle" | "ellipse" | "diamond" {
  if (node.shape === "cylinder" || node.shape === "actor") return "ellipse";
  if (node.shape === "hexagon") return "diamond";
  return "rectangle";
}

function roundness(node: ExportNode): { type: 3 } | null {
  if (node.shape === "rectangle" || node.shape === "cylinder" || node.shape === "hexagon" || node.shape === "actor") {
    return null;
  }
  return { type: 3 };
}

function baseElement(id: string, order: number, patch: Partial<ExcalidrawElement> & Pick<ExcalidrawElement, "type" | "x" | "y" | "width" | "height">): ExcalidrawElement {
  return {
    id,
    angle: 0,
    strokeColor: "#18181b",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: indexKey(order),
    roundness: null,
    seed: seedFrom(id),
    version: 1,
    versionNonce: seedFrom(`${id}:nonce`),
    isDeleted: false,
    boundElements: null,
    updated: 1,
    link: null,
    locked: false,
    ...patch,
  };
}

function nodeElements(node: ExportNode, order: number): ExcalidrawElement[] {
  const textId = `${node.id}:label`;
  const shape = baseElement(node.id, order, {
    type: shapeType(node),
    x: node.absX,
    y: node.absY,
    width: node.width,
    height: node.height,
    strokeColor: node.stroke,
    backgroundColor: node.fill,
    strokeStyle: node.dashed ? "dashed" : "solid",
    opacity: node.opacity,
    roundness: roundness(node),
    boundElements: node.lines.length ? [{ id: textId, type: "text" }] : null,
  });
  if (!node.lines.length) return [shape];
  const text = node.lines.join("\n");
  const label = baseElement(textId, order + 1, {
    type: "text",
    x: node.absX + 12,
    y: node.absY + (node.verticalAlign === "top" ? 10 : node.height / 2 - (node.lines.length * FONT_SIZE * LINE_HEIGHT) / 2),
    width: Math.max(16, node.width - 24),
    height: node.lines.length * FONT_SIZE * LINE_HEIGHT,
    strokeColor: "#18181b",
    backgroundColor: "transparent",
    strokeWidth: 1,
    opacity: node.opacity,
    text,
    fontSize: FONT_SIZE,
    fontFamily: 2,
    textAlign: node.align,
    verticalAlign: node.verticalAlign,
    containerId: node.id,
    originalText: text,
    autoResize: true,
    lineHeight: LINE_HEIGHT,
  });
  return [shape, label];
}

function arrowElement(edge: ExportEdge, nodes: Map<string, ExportNode>, order: number): ExcalidrawElement | null {
  const source = nodes.get(edge.sourceId);
  const target = nodes.get(edge.targetId);
  if (!source || !target) return null;
  const start = { x: source.absX + source.width, y: source.absY + source.height / 2 };
  const end = { x: target.absX, y: target.absY + target.height / 2 };
  const midX = start.x + (end.x - start.x) / 2;
  const raw =
    edge.lineShape === "step"
      ? [
          [0, 0],
          [midX - start.x, 0],
          [midX - start.x, end.y - start.y],
          [end.x - start.x, end.y - start.y],
        ]
      : edge.lineShape === "bezier"
        ? [
            [0, 0],
            [(end.x - start.x) / 2, 0],
            [end.x - start.x, end.y - start.y],
          ]
        : [
            [0, 0],
            [end.x - start.x, end.y - start.y],
          ];
  const minX = Math.min(...raw.map((point) => point[0] ?? 0));
  const minY = Math.min(...raw.map((point) => point[1] ?? 0));
  const points = raw.map((point) => [Number(((point[0] ?? 0) - minX).toFixed(2)), Number(((point[1] ?? 0) - minY).toFixed(2))] as [number, number]);
  const width = Math.max(1, ...points.map((point) => point[0]));
  const height = Math.max(1, ...points.map((point) => point[1]));
  return baseElement(`edge:${edge.id}`, order, {
    type: "arrow",
    x: Number((start.x + minX).toFixed(2)),
    y: Number((start.y + minY).toFixed(2)),
    width,
    height,
    strokeColor: "#71717a",
    backgroundColor: "transparent",
    strokeStyle: edge.dashed ? "dashed" : "solid",
    points,
    lastCommittedPoint: null,
    startBinding: { elementId: source.id, fixedPoint: [1, 0.5], mode: "orbit" },
    endBinding: { elementId: target.id, fixedPoint: [0, 0.5], mode: "orbit" },
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
  });
}

function labelElement(edge: ExportEdge, arrow: ExcalidrawElement, order: number): ExcalidrawElement | null {
  if (!edge.label) return null;
  const width = Math.max(48, edge.label.length * 7);
  return baseElement(`edge:${edge.id}:label`, order, {
    type: "text",
    x: arrow.x + arrow.width / 2 - width / 2,
    y: arrow.y + arrow.height / 2 - 10,
    width,
    height: FONT_SIZE * LINE_HEIGHT,
    strokeColor: "#3f3f46",
    backgroundColor: "transparent",
    strokeWidth: 1,
    text: edge.label,
    fontSize: FONT_SIZE,
    fontFamily: 2,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: null,
    originalText: edge.label,
    autoResize: true,
    lineHeight: LINE_HEIGHT,
  });
}

export function toExcalidraw(snapshot: DiagramSnapshot): string {
  const { nodes, edges } = layoutDiagram(snapshot);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const elements: ExcalidrawElement[] = [];
  for (const node of nodes) {
    elements.push(...nodeElements(node, elements.length));
  }
  for (const edge of edges) {
    const arrow = arrowElement(edge, byId, elements.length);
    if (!arrow) continue;
    elements.push(arrow);
    for (const endpointId of [edge.sourceId, edge.targetId]) {
      const endpoint = elements.find((element) => element.id === endpointId);
      if (!endpoint) continue;
      endpoint.boundElements = [...(endpoint.boundElements ?? []), { id: arrow.id, type: "arrow" }];
    }
    const label = labelElement(edge, arrow, elements.length);
    if (label) elements.push(label);
  }
  return JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://clusterdeck.space",
      elements,
      appState: {
        viewBackgroundColor: "#ffffff",
        gridSize: 20,
      },
      files: {},
    },
    null,
    2,
  );
}
