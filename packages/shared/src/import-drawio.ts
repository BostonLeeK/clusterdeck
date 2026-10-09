import {
  createInfraNodeData,
  emptyMeta,
  type DiagramEdge,
  type DiagramNode,
  type DiagramSnapshot,
  type EdgeDirection,
  type EdgeLineShape,
  type InfraNodeTypeId,
  type NodeShape,
} from "./node-types";

type RawCell = {
  id: string;
  value: string;
  style: string;
  parent: string;
  source?: string;
  target?: string;
  vertex: boolean;
  edge: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

function decodeXmlEntities(value: string) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function attr(attrs: string, name: string) {
  const match = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(attrs);
  return match ? decodeXmlEntities(match[1]!) : "";
}

function styleFlag(style: string, key: string) {
  return style.split(";").some((part) => part.trim() === key || part.trim().startsWith(`${key}=`));
}

function styleValue(style: string, key: string) {
  for (const part of style.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === key) return rest.join("=");
  }
  return "";
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function labelLines(raw: string) {
  if (!raw.trim()) return [] as string[];
  return stripHtml(raw);
}

function importId(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "0" || trimmed === "1") return trimmed;
  if (trimmed.startsWith("df-")) return trimmed.slice(3);
  return trimmed.replace(/[^a-zA-Z0-9._:-]/g, "_");
}

function parseGeometry(chunk: string) {
  const geoMatch = /<mxGeometry\b([^>]*)\/?>/i.exec(chunk);
  const attrs = geoMatch?.[1] ?? "";
  return {
    x: Number(attr(attrs, "x") || "0") || 0,
    y: Number(attr(attrs, "y") || "0") || 0,
    width: Number(attr(attrs, "width") || "0") || 0,
    height: Number(attr(attrs, "height") || "0") || 0,
  };
}

function parseCells(modelXml: string): RawCell[] {
  const cells: RawCell[] = [];
  const re = /<mxCell\b([^>]*)(?:\/>|>([\s\S]*?)<\/mxCell>)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(modelXml))) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const id = attr(attrs, "id");
    if (!id) continue;
    const geometry = parseGeometry(body || attrs);
    cells.push({
      id,
      value: attr(attrs, "value"),
      style: attr(attrs, "style"),
      parent: attr(attrs, "parent") || "1",
      source: attr(attrs, "source") || undefined,
      target: attr(attrs, "target") || undefined,
      vertex: attr(attrs, "vertex") === "1",
      edge: attr(attrs, "edge") === "1",
      ...geometry,
    });
  }
  return cells;
}

async function inflateRawBase64(data: string): Promise<string> {
  const normalized = data.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const buffer = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  const zlib = await import("node:zlib").catch(() => null);
  if (!zlib) throw new Error("Unable to decompress draw.io diagram");
  return zlib.inflateRawSync(Buffer.from(bytes)).toString("utf8");
}

async function decodeDiagramPayload(payload: string): Promise<string> {
  const trimmed = payload.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) return trimmed;
  try {
    const inflated = await inflateRawBase64(trimmed);
    try {
      return decodeURIComponent(inflated);
    } catch {
      return inflated;
    }
  } catch {
    return trimmed;
  }
}

async function extractGraphModels(xml: string): Promise<string[]> {
  const models: string[] = [];
  const modelRe = /<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/gi;
  let modelMatch: RegExpExecArray | null;
  while ((modelMatch = modelRe.exec(xml))) {
    models.push(modelMatch[0]!);
  }
  if (models.length) return models;

  const diagramRe = /<diagram\b[^>]*>([\s\S]*?)<\/diagram>/gi;
  let diagramMatch: RegExpExecArray | null;
  while ((diagramMatch = diagramRe.exec(xml))) {
    const decoded = await decodeDiagramPayload(diagramMatch[1] ?? "");
    if (decoded.includes("<mxGraphModel")) {
      const nested = /<mxGraphModel\b[\s\S]*?<\/mxGraphModel>/i.exec(decoded);
      if (nested) models.push(nested[0]!);
      else models.push(decoded);
    } else if (decoded.includes("<mxCell")) {
      models.push(`<mxGraphModel><root>${decoded}</root></mxGraphModel>`);
    }
  }
  return models;
}

function inferKind(style: string): "infra" | "group" | "note" {
  if (styleFlag(style, "container=1") || styleValue(style, "shape") === "swimlane") return "group";
  const shape = styleValue(style, "shape");
  if (shape === "note" || styleValue(style, "fillColor").toLowerCase() === "#fffbeb") return "note";
  if (styleValue(style, "align") === "left" && styleValue(style, "verticalAlign") === "top" && !styleFlag(style, "container=1")) {
    if (shape === "" && styleFlag(style, "rounded=1") && styleValue(style, "strokeColor").toLowerCase() === "#d4d4d8") {
      return "note";
    }
  }
  return "infra";
}

function inferShape(style: string): NodeShape {
  const shape = styleValue(style, "shape");
  if (shape === "cylinder3" || shape === "cylinder") return "cylinder";
  if (shape === "hexagon") return "hexagon";
  if (shape === "ellipse" || shape === "actor") return "actor";
  if (styleValue(style, "arcSize") === "50") return "stadium";
  if (styleFlag(style, "rounded=0")) return "rectangle";
  return "rounded";
}

function inferTypeId(style: string, title: string): InfraNodeTypeId {
  const shape = styleValue(style, "shape");
  const lower = title.toLowerCase();
  if (shape === "cylinder3" || shape === "cylinder" || /postgres|database|db\b|mysql|mongo/.test(lower)) return "postgres";
  if (/redis|cache/.test(lower)) return "redis";
  if (/kafka/.test(lower)) return "kafka";
  if (/rabbit|amqp/.test(lower)) return "rabbitmq";
  if (/queue|sqs/.test(lower)) return "queue";
  if (/s3|bucket|blob|storage/.test(lower)) return "s3";
  if (/cdn|cloudfront/.test(lower)) return "cdn";
  if (/gateway|api gateway/.test(lower)) return "api-gateway";
  if (/load.?balanc|nginx|lb\b/.test(lower)) return "load-balancer";
  if (/lambda|function/.test(lower)) return "lambda";
  if (/container|docker|pod/.test(lower)) return "container";
  if (/user|actor|customer/.test(lower) || shape === "ellipse") return "user";
  if (/auth|identity|oauth|sso/.test(lower)) return "auth";
  if (shape === "hexagon") return "custom";
  if (styleValue(style, "arcSize") === "50") return "service";
  return "app";
}

function inferEdgeDirection(style: string): EdgeDirection {
  const end = styleValue(style, "endArrow");
  const start = styleValue(style, "startArrow");
  const endOn = end && end !== "none";
  const startOn = start && start !== "none";
  if (endOn && startOn) return "both";
  if (!endOn && startOn) return "backward";
  return "forward";
}

function inferLineShape(style: string): EdgeLineShape {
  if (styleFlag(style, "edgeStyle=orthogonalEdgeStyle") || styleValue(style, "edgeStyle") === "orthogonalEdgeStyle") {
    return "step";
  }
  if (styleFlag(style, "curved=1") || styleValue(style, "curved") === "1") return "bezier";
  return "straight";
}

function parseEdgeLabel(value: string): { label?: string; reverseLabel?: string; direction?: EdgeDirection } {
  const text = labelLines(value).join(" ");
  if (!text) return {};
  const both = text.match(/^→\s*(.+?)\s*\/\s*←\s*(.+)$/);
  if (both) return { label: both[1]!.trim(), reverseLabel: both[2]!.trim(), direction: "both" };
  const reverse = text.match(/^←\s*(.+)$/);
  if (reverse) return { reverseLabel: reverse[1]!.trim(), direction: "backward" };
  const forward = text.match(/^→\s*(.+)$/);
  if (forward) return { label: forward[1]!.trim(), direction: "forward" };
  return { label: text };
}

function cellsToSnapshot(cells: RawCell[]): DiagramSnapshot {
  const usable = cells.filter((cell) => cell.id !== "0" && cell.id !== "1");
  const idMap = new Map<string, string>();
  for (const cell of usable) idMap.set(cell.id, importId(cell.id));

  const vertexIds = new Set(usable.filter((cell) => cell.vertex).map((cell) => cell.id));
  const nodes: DiagramNode[] = [];

  for (const cell of usable) {
    if (!cell.vertex) continue;
    const id = idMap.get(cell.id)!;
    const lines = labelLines(cell.value);
    const title = lines[0] || "Untitled";
    const subtitle = lines[1];
    const rest = lines.slice(2).join("\n");
    const parentRaw = cell.parent;
    const parentId =
      parentRaw && parentRaw !== "0" && parentRaw !== "1" && vertexIds.has(parentRaw)
        ? idMap.get(parentRaw)
        : undefined;
    const kind = inferKind(cell.style);
    const width = cell.width > 0 ? cell.width : undefined;
    const height = cell.height > 0 ? cell.height : undefined;

    if (kind === "group") {
      nodes.push({
        id,
        type: "group",
        position: { x: cell.x, y: cell.y },
        parentId,
        extent: parentId ? "parent" : undefined,
        width: width ?? 520,
        height: height ?? 280,
        data: {
          kind: "group",
          title,
          subtitle,
          description: rest || undefined,
          tags: [],
        },
      });
      continue;
    }

    if (kind === "note") {
      nodes.push({
        id,
        type: "note",
        position: { x: cell.x, y: cell.y },
        parentId,
        extent: parentId ? "parent" : undefined,
        width: width ?? 240,
        height: height ?? 96,
        data: {
          kind: "note",
          title,
          body: lines.slice(1).join("\n") || undefined,
          tone: styleValue(cell.style, "fillColor").toLowerCase() === "#fffbeb" ? "comment" : "text",
        },
      });
      continue;
    }

    const typeId = inferTypeId(cell.style, title);
    const shape = inferShape(cell.style);
    const dashed = styleFlag(cell.style, "dashed=1") || styleValue(cell.style, "dashed") === "1";
    nodes.push({
      id,
      type: "infra",
      position: { x: cell.x, y: cell.y },
      parentId,
      extent: parentId ? "parent" : undefined,
      width: width ?? 200,
      height: height ?? 88,
      data: createInfraNodeData(typeId, {
        title,
        subtitle,
        displayDescription: rest || undefined,
        shape,
        scope: dashed ? "external" : "internal",
      }),
    });
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: DiagramEdge[] = [];
  for (const cell of usable) {
    if (!cell.edge || !cell.source || !cell.target) continue;
    const source = idMap.get(cell.source);
    const target = idMap.get(cell.target);
    if (!source || !target || !nodeIds.has(source) || !nodeIds.has(target)) continue;
    const parsed = parseEdgeLabel(cell.value);
    const direction = parsed.direction ?? inferEdgeDirection(cell.style);
    edges.push({
      id: idMap.get(cell.id) ?? importId(cell.id),
      source,
      target,
      label: parsed.label,
      reverseLabel: parsed.reverseLabel,
      direction,
      lineShape: inferLineShape(cell.style),
      animated: styleFlag(cell.style, "dashed=1") || styleValue(cell.style, "dashed") === "1",
    });
  }

  return { nodes, edges, meta: emptyMeta() };
}

export async function fromDrawio(input: string): Promise<DiagramSnapshot> {
  const xml = input.replace(/^\uFEFF/, "").trim();
  if (!xml) throw new Error("Empty draw.io file");
  if (xml.startsWith("{") || xml.startsWith("[")) {
    throw new Error("JSON is not a draw.io file");
  }

  const models = await extractGraphModels(xml);
  if (!models.length) throw new Error("No draw.io diagram found");

  const pages = models.map((model) => cellsToSnapshot(parseCells(model)));
  if (pages.length === 1) return pages[0]!;

  const merged: DiagramSnapshot = { nodes: [], edges: [], meta: emptyMeta() };
  let offsetX = 0;
  pages.forEach((page, pageIndex) => {
    const maxX = page.nodes.reduce((max, node) => Math.max(max, node.position.x + (node.width ?? 200)), 0);
    const idSuffix = pageIndex === 0 ? "" : `p${pageIndex}`;
    const remap = new Map<string, string>();
    for (const node of page.nodes) {
      remap.set(node.id, idSuffix ? `${node.id}-${idSuffix}` : node.id);
    }
    for (const node of page.nodes) {
      const nextId = remap.get(node.id)!;
      merged.nodes.push({
        ...node,
        id: nextId,
        parentId: node.parentId ? remap.get(node.parentId) : undefined,
        position: { x: node.position.x + offsetX, y: node.position.y },
      });
    }
    for (const edge of page.edges) {
      const source = remap.get(edge.source);
      const target = remap.get(edge.target);
      if (!source || !target) continue;
      merged.edges.push({
        ...edge,
        id: idSuffix ? `${edge.id}-${idSuffix}` : edge.id,
        source,
        target,
      });
    }
    offsetX += Math.max(400, maxX + 80);
  });
  return merged;
}

export function isDrawioFile(name: string, contents: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".drawio") || lower.endsWith(".xml") || lower.endsWith(".dio")) return true;
  const head = contents.trim().slice(0, 200).toLowerCase();
  return head.includes("<mxfile") || head.includes("<mxgraphmodel") || head.includes("<diagram");
}
