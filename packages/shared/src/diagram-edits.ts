import {
  NODE_TYPE_IDS,
  createInfraNodeData,
  type DiagramEdge,
  type DiagramNode,
  type DiagramNodeKind,
  type DiagramSnapshot,
  type EdgeDirection,
  type EdgeLineShape,
  type InfraNodeTypeId,
  type NodeLifecycle,
  type NodeScope,
  type NodeShape,
  type NodeStatus,
} from "./node-types";

const TYPE_IDS = new Set<string>(NODE_TYPE_IDS);

export interface NodeInput {
  id?: string;
  kind?: DiagramNodeKind;
  position?: { x: number; y: number };
  parentId?: string | null;
  width?: number;
  height?: number;
  title?: string;
  typeId?: string;
  subtitle?: string;
  description?: string;
  displayDescription?: string;
  tags?: string[];
  status?: NodeStatus;
  shape?: NodeShape;
  scope?: NodeScope;
  lifecycle?: NodeLifecycle;
  technologies?: string[];
  body?: string;
  tone?: "text" | "comment";
  direction?: "in" | "out";
  protocol?: string;
  parentNodeId?: string;
  parentEdgeId?: string;
}

export interface EdgeInput {
  id?: string;
  source?: string;
  target?: string;
  label?: string;
  reverseLabel?: string;
  animated?: boolean;
  lineShape?: EdgeLineShape;
  direction?: EdgeDirection;
}

export type DiagramEdits = {
  upsertNodes?: NodeInput[];
  deleteNodeIds?: string[];
  upsertEdges?: EdgeInput[];
  deleteEdgeIds?: string[];
};

export type DiagramEditResult = {
  snapshot: DiagramSnapshot;
  upsertedNodeIds: string[];
  deletedNodeIds: string[];
  upsertedEdgeIds: string[];
  deletedEdgeIds: string[];
};

function infraTypeId(value: string | undefined): InfraNodeTypeId {
  if (!value || !TYPE_IDS.has(value)) throw new Error(`unknown infra typeId "${value ?? ""}"`);
  return value as InfraNodeTypeId;
}

function applyFrame(node: DiagramNode, input: NodeInput): DiagramNode {
  const next = { ...node };
  if (input.position) next.position = { x: input.position.x, y: input.position.y };
  if (input.parentId === null) delete next.parentId;
  else if (typeof input.parentId === "string") next.parentId = input.parentId;
  if (typeof input.width === "number") next.width = input.width;
  if (typeof input.height === "number") next.height = input.height;
  return next;
}

function createNode(id: string, input: NodeInput): DiagramNode {
  if (!input.position) throw new Error("position is required for a new node");
  const kind = input.kind ?? "infra";
  const frame = {
    id,
    type: kind,
    position: input.position,
    parentId: input.parentId ?? undefined,
    width: input.width,
    height: input.height,
  };
  if (kind === "infra") {
    return {
      ...frame,
      parentId: frame.parentId || undefined,
      data: createInfraNodeData(infraTypeId(input.typeId), {
        title: input.title,
        subtitle: input.subtitle,
        description: input.description,
        displayDescription: input.displayDescription,
        tags: input.tags,
        status: input.status,
        shape: input.shape,
        scope: input.scope,
        lifecycle: input.lifecycle,
        technologies: input.technologies,
      }),
    };
  }
  if (kind === "group") {
    return {
      ...frame,
      width: input.width ?? 520,
      height: input.height ?? 280,
      data: {
        kind: "group",
        title: input.title?.trim() || "Group",
        subtitle: input.subtitle,
        description: input.description,
        tags: input.tags ?? [],
      },
    };
  }
  if (kind === "note") {
    return {
      ...frame,
      data: {
        kind: "note",
        title: input.title?.trim() || "Text",
        body: input.body,
        tone: input.tone ?? "text",
      },
    };
  }
  if (!input.direction || !input.parentNodeId || !input.parentEdgeId) {
    throw new Error("a new port needs direction, parentNodeId, and parentEdgeId");
  }
  return {
    ...frame,
    data: {
      kind: "port",
      title: input.title?.trim() || "Port",
      direction: input.direction,
      protocol: input.protocol,
      parentNodeId: input.parentNodeId,
      parentEdgeId: input.parentEdgeId,
    },
  };
}

function mergeNode(existing: DiagramNode, input: NodeInput): DiagramNode {
  if (input.kind && input.kind !== existing.type) throw new Error(`cannot change kind of node ${existing.id}`);
  const next = applyFrame(existing, input);
  if (existing.data.kind === "infra") {
    const typeId = input.typeId ? infraTypeId(input.typeId) : existing.data.typeId;
    next.data = {
      ...existing.data,
      typeId,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.displayDescription !== undefined ? { displayDescription: input.displayDescription } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.shape !== undefined ? { shape: input.shape } : {}),
      ...(input.scope !== undefined ? { scope: input.scope } : {}),
      ...(input.lifecycle !== undefined ? { lifecycle: input.lifecycle } : {}),
      ...(input.technologies !== undefined ? { technologies: input.technologies } : {}),
    };
    return next;
  }
  if (existing.data.kind === "group") {
    next.data = {
      ...existing.data,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    };
    return next;
  }
  if (existing.data.kind === "note") {
    next.data = {
      ...existing.data,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.tone !== undefined ? { tone: input.tone } : {}),
    };
    return next;
  }
  next.data = {
    ...existing.data,
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.direction !== undefined ? { direction: input.direction } : {}),
    ...(input.protocol !== undefined ? { protocol: input.protocol } : {}),
    ...(input.parentNodeId !== undefined ? { parentNodeId: input.parentNodeId } : {}),
    ...(input.parentEdgeId !== undefined ? { parentEdgeId: input.parentEdgeId } : {}),
  };
  return next;
}

function upsertEdge(existing: DiagramEdge | undefined, input: EdgeInput, id: string): DiagramEdge {
  if (!existing && (!input.source || !input.target)) throw new Error("a new edge needs source and target");
  return {
    id,
    source: input.source ?? existing?.source ?? "",
    target: input.target ?? existing?.target ?? "",
    label: input.label !== undefined ? input.label : existing?.label,
    animated: input.animated !== undefined ? input.animated : existing?.animated,
    lineShape: input.lineShape ?? existing?.lineShape ?? "bezier",
    direction: input.direction ?? existing?.direction ?? "forward",
    reverseLabel: input.reverseLabel !== undefined ? input.reverseLabel : existing?.reverseLabel,
    sourceHandle: existing?.sourceHandle,
    targetHandle: existing?.targetHandle,
  };
}

export function applyEditsToSnapshot(snapshot: DiagramSnapshot, edits: DiagramEdits): DiagramEditResult {
  const stagedNodes = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const stagedEdges = new Map(snapshot.edges.map((edge) => [edge.id, edge]));
  const upsertedNodeIds: string[] = [];
  const deletedNodeIds: string[] = [];
  const upsertedEdgeIds: string[] = [];
  const deletedEdgeIds: string[] = [];

  for (const input of edits.upsertNodes ?? []) {
    const existing = input.id ? stagedNodes.get(input.id) : undefined;
    const id = existing?.id ?? input.id ?? crypto.randomUUID();
    stagedNodes.set(id, existing ? mergeNode(existing, input) : createNode(id, input));
    upsertedNodeIds.push(id);
  }

  for (const id of edits.deleteNodeIds ?? []) {
    if (!stagedNodes.has(id)) continue;
    stagedNodes.delete(id);
    deletedNodeIds.push(id);
  }

  for (const input of edits.upsertEdges ?? []) {
    const existing = input.id ? stagedEdges.get(input.id) : undefined;
    const id = existing?.id ?? input.id ?? crypto.randomUUID();
    stagedEdges.set(id, upsertEdge(existing, input, id));
    upsertedEdgeIds.push(id);
  }

  for (const id of edits.deleteEdgeIds ?? []) {
    if (!stagedEdges.has(id)) continue;
    stagedEdges.delete(id);
    deletedEdgeIds.push(id);
  }

  const danglingEdgeIds = Array.from(stagedEdges.entries())
    .filter(([, edge]) => !stagedNodes.has(edge.source) || !stagedNodes.has(edge.target))
    .map(([id]) => id);
  for (const id of danglingEdgeIds) {
    stagedEdges.delete(id);
    if (!deletedEdgeIds.includes(id)) deletedEdgeIds.push(id);
  }

  return {
    snapshot: {
      nodes: Array.from(stagedNodes.values()),
      edges: Array.from(stagedEdges.values()),
      meta: snapshot.meta,
    },
    upsertedNodeIds,
    deletedNodeIds,
    upsertedEdgeIds,
    deletedEdgeIds,
  };
}
