import {
  NODE_TYPE_IDS,
  createInfraNodeData,
  emptyMeta,
  normalizeNodeProperties,
  type ConnectorDirection,
  type DiagramEdge,
  type DiagramFlow,
  type DiagramMeta,
  type DiagramNode,
  type DiagramNodeKind,
  type DiagramSnapshot,
  type EdgeDirection,
  type EdgeLineShape,
  type InfraNodeTypeId,
  type NodeConnector,
  type NodeLifecycle,
  type NodeProperty,
  type NodeHealthAlert,
  type NodeHealthConfig,
  type NodeHealthKind,
  type NodeScope,
  type NodeShape,
  type NodeStatus,
  type TagDef,
} from "./node-types";

const TYPE_IDS = new Set<string>(NODE_TYPE_IDS);

export type PropertyInput = {
  id?: string;
  key: string;
  value: string;
  icon?: string;
  showOnCanvas?: boolean;
};

export type ConnectorInput = {
  nodeId: string;
  title: string;
  direction: ConnectorDirection;
};

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
  accentColor?: string | null;
  health?: NodeHealthConfig | null;
  properties?: PropertyInput[];
  connectors?: ConnectorInput[];
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
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  reverseLabel?: string;
  animated?: boolean;
  lineShape?: EdgeLineShape;
  direction?: EdgeDirection;
}

export type MetaInput = {
  tagDefs?: TagDef[];
  flows?: DiagramFlow[];
};

export type DiagramEdits = {
  upsertNodes?: NodeInput[];
  deleteNodeIds?: string[];
  upsertEdges?: EdgeInput[];
  deleteEdgeIds?: string[];
  meta?: MetaInput;
};

export type DiagramEditResult = {
  snapshot: DiagramSnapshot;
  upsertedNodeIds: string[];
  deletedNodeIds: string[];
  upsertedEdgeIds: string[];
  deletedEdgeIds: string[];
  metaUpdated: boolean;
};

function infraTypeId(value: string | undefined): InfraNodeTypeId {
  if (!value || !TYPE_IDS.has(value)) throw new Error(`unknown infra typeId "${value ?? ""}"`);
  return value as InfraNodeTypeId;
}

function normalizeConnectors(connectors: ConnectorInput[] | undefined): NodeConnector[] | undefined {
  if (connectors === undefined) return undefined;
  return connectors.map((item) => {
    const nodeId = item.nodeId?.trim();
    const title = item.title?.trim();
    if (!nodeId) throw new Error("connector.nodeId is required");
    if (!title) throw new Error("connector.title is required");
    if (item.direction !== "in" && item.direction !== "out") {
      throw new Error('connector.direction must be "in" or "out"');
    }
    return { nodeId, title, direction: item.direction };
  });
}

function normalizeProperties(properties: PropertyInput[] | undefined): NodeProperty[] | undefined {
  if (properties === undefined) return undefined;
  return normalizeNodeProperties(
    properties.map((property) => ({
      id: property.id,
      key: property.key,
      value: property.value,
      icon: property.icon,
      showOnCanvas: property.showOnCanvas,
    })),
  );
}

function normalizeAlert(alert: NodeHealthAlert | undefined): NodeHealthAlert | undefined {
  if (!alert) return undefined;
  const emails = (alert.emails ?? [])
    .map((item) => item.trim().toLowerCase())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
    .slice(0, 10);
  const slackRaw = alert.slackWebhookUrl?.trim() ?? "";
  const slackWebhookUrl =
    slackRaw && /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(slackRaw)
      ? slackRaw
      : undefined;
  const failCount =
    typeof alert.failCount === "number" && alert.failCount > 0
      ? Math.min(Math.floor(alert.failCount), 50)
      : 3;
  const windowSec =
    typeof alert.windowSec === "number" && alert.windowSec > 0
      ? Math.min(Math.floor(alert.windowSec), 86_400)
      : 300;
  const cooldownSec =
    typeof alert.cooldownSec === "number" && alert.cooldownSec > 0
      ? Math.min(Math.floor(alert.cooldownSec), 604_800)
      : 3600;
  return {
    enabled: Boolean(alert.enabled),
    emails: emails.length ? emails : undefined,
    slackWebhookUrl,
    failCount,
    windowSec,
    cooldownSec,
  };
}

function normalizeHealth(health: NodeHealthConfig | null | undefined): NodeHealthConfig | null | undefined {
  if (health === undefined) return undefined;
  if (health === null) return null;
  const kind = (["http", "tcp", "external"] as NodeHealthKind[]).includes(health.kind)
    ? health.kind
    : ("external" as NodeHealthKind);
  const url = health.url?.trim() || undefined;
  const expectStatus =
    typeof health.expectStatus === "number" && health.expectStatus >= 100 && health.expectStatus < 600
      ? Math.floor(health.expectStatus)
      : undefined;
  const intervalSec =
    typeof health.intervalSec === "number" && health.intervalSec > 0
      ? Math.min(Math.floor(health.intervalSec), 86_400)
      : undefined;
  const staleAfterSec =
    typeof health.staleAfterSec === "number" && health.staleAfterSec > 0
      ? Math.min(Math.floor(health.staleAfterSec), 86_400)
      : undefined;
  const alert = normalizeAlert(health.alert);
  return {
    enabled: Boolean(health.enabled),
    kind,
    url,
    expectStatus,
    intervalSec,
    staleAfterSec,
    ...(alert ? { alert } : {}),
  };
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
  const connectors = normalizeConnectors(input.connectors);
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
        health: normalizeHealth(input.health) ?? undefined,
        technologies: input.technologies,
        accentColor: input.accentColor ?? undefined,
        properties: normalizeProperties(input.properties),
        connectors,
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
        ...(connectors !== undefined ? { connectors } : {}),
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
  const connectors = normalizeConnectors(input.connectors);
  const properties = normalizeProperties(input.properties);
  if (existing.data.kind === "infra") {
    const typeId = input.typeId ? infraTypeId(input.typeId) : existing.data.typeId;
    const health = normalizeHealth(input.health);
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
      ...(input.accentColor !== undefined
        ? { accentColor: input.accentColor === null ? undefined : input.accentColor }
        : {}),
      ...(properties !== undefined ? { properties } : {}),
      ...(connectors !== undefined ? { connectors } : {}),
      ...(health !== undefined ? { health: health ?? undefined } : {}),
    };
    if (input.accentColor === null) delete (next.data as { accentColor?: string }).accentColor;
    if (health === null) delete (next.data as { health?: NodeHealthConfig }).health;
    return next;
  }
  if (existing.data.kind === "group") {
    next.data = {
      ...existing.data,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.subtitle !== undefined ? { subtitle: input.subtitle } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(connectors !== undefined ? { connectors } : {}),
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
  const edge: DiagramEdge = {
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
  if (input.sourceHandle !== undefined) {
    edge.sourceHandle = input.sourceHandle === null ? undefined : input.sourceHandle;
  }
  if (input.targetHandle !== undefined) {
    edge.targetHandle = input.targetHandle === null ? undefined : input.targetHandle;
  }
  return edge;
}

function mergeMeta(current: DiagramMeta | undefined, input: MetaInput | undefined): { meta: DiagramMeta; metaUpdated: boolean } {
  const base = current ?? emptyMeta();
  if (!input) return { meta: base, metaUpdated: false };
  return {
    meta: {
      tagDefs: input.tagDefs !== undefined ? input.tagDefs : base.tagDefs,
      flows: input.flows !== undefined ? input.flows : base.flows,
    },
    metaUpdated: true,
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

  const { meta, metaUpdated } = mergeMeta(snapshot.meta, edits.meta);

  return {
    snapshot: {
      nodes: Array.from(stagedNodes.values()),
      edges: Array.from(stagedEdges.values()),
      meta,
    },
    upsertedNodeIds,
    deletedNodeIds,
    upsertedEdgeIds,
    deletedEdgeIds,
    metaUpdated,
  };
}
