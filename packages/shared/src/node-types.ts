export const NODE_CATEGORIES = ["compute", "data", "messaging", "network", "external", "config"] as const;

export type NodeCategory = (typeof NODE_CATEGORIES)[number];

export const NODE_TYPE_IDS = [
  "service",
  "lambda",
  "container",
  "postgres",
  "redis",
  "s3",
  "kafka",
  "rabbitmq",
  "load-balancer",
  "api-gateway",
  "cdn",
  "third-party",
  "user",
  "config-map",
  "secret",
] as const;

export type InfraNodeTypeId = (typeof NODE_TYPE_IDS)[number];

export type NodeStatus = "healthy" | "degraded" | "unknown" | "offline";

export const NODE_SHAPES = ["rounded", "rectangle", "cylinder", "hexagon", "actor", "stadium"] as const;
export type NodeShape = (typeof NODE_SHAPES)[number];

export const NODE_SCOPES = ["internal", "external"] as const;
export type NodeScope = (typeof NODE_SCOPES)[number];

export const NODE_LIFECYCLES = ["live", "future", "deprecated", "removed"] as const;
export type NodeLifecycle = (typeof NODE_LIFECYCLES)[number];

export const EDGE_LINE_SHAPES = ["bezier", "straight", "step"] as const;
export type EdgeLineShape = (typeof EDGE_LINE_SHAPES)[number];

export type DiagramNodeKind = "infra" | "group" | "port" | "note";

export type ProjectKind = "personal" | "shared";

export type LinkAccess = "none" | "view";

export type MemberRole = "owner" | "editor" | "viewer";

export type WorkspaceRole = "owner" | "admin" | "member";

export interface NodeProperty {
  key: string;
  value: string;
}

export interface InfraNodeData {
  kind: "infra";
  title: string;
  typeId: InfraNodeTypeId;
  subtitle?: string;
  description?: string;
  displayDescription?: string;
  tags: string[];
  status: NodeStatus;
  properties: NodeProperty[];
  shape?: NodeShape;
  accentColor?: string;
  scope?: NodeScope;
  lifecycle?: NodeLifecycle;
  technologies?: string[];
  childDiagramId?: string | null;
  childCount?: number;
  [key: string]: unknown;
}

export interface GroupNodeData {
  kind: "group";
  title: string;
  subtitle?: string;
  tags: string[];
  childCount?: number;
  [key: string]: unknown;
}

export interface PortNodeData {
  kind: "port";
  title: string;
  direction: "in" | "out";
  protocol?: string;
  parentNodeId: string;
  parentEdgeId: string;
  [key: string]: unknown;
}

export interface NoteNodeData {
  kind: "note";
  title: string;
  body?: string;
  tone?: "text" | "comment";
  [key: string]: unknown;
}

export type DiagramNodeData = InfraNodeData | GroupNodeData | PortNodeData | NoteNodeData;

export interface DiagramNode {
  id: string;
  type: DiagramNodeKind;
  position: { x: number; y: number };
  parentId?: string;
  extent?: "parent";
  width?: number;
  height?: number;
  data: DiagramNodeData;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  animated?: boolean;
  lineShape?: EdgeLineShape;
}

export interface TagDef {
  id: string;
  label: string;
  color: string;
}

export interface DiagramFlow {
  id: string;
  name: string;
  color: string;
  edgeIds: string[];
}

export interface DiagramMeta {
  tagDefs: TagDef[];
  flows: DiagramFlow[];
}

export interface DiagramSnapshot {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  meta?: DiagramMeta;
}

export interface NodeTypeDefinition {
  id: InfraNodeTypeId;
  label: string;
  category: NodeCategory;
  subtitle: string;
  icon: string;
  color: string;
  defaultShape: NodeShape;
  defaultScope: NodeScope;
}

export const NODE_LIBRARY: NodeTypeDefinition[] = [
  { id: "service", label: "Service", category: "compute", subtitle: "Service", icon: "shield", color: "#818cf8", defaultShape: "rounded", defaultScope: "internal" },
  { id: "lambda", label: "Lambda", category: "compute", subtitle: "Function", icon: "zap", color: "#fbbf24", defaultShape: "rounded", defaultScope: "internal" },
  { id: "container", label: "Container", category: "compute", subtitle: "Container", icon: "box", color: "#34d399", defaultShape: "rounded", defaultScope: "internal" },
  { id: "postgres", label: "PostgreSQL", category: "data", subtitle: "Database", icon: "database", color: "#60a5fa", defaultShape: "cylinder", defaultScope: "internal" },
  { id: "redis", label: "Redis", category: "data", subtitle: "Cache", icon: "layers", color: "#f87171", defaultShape: "cylinder", defaultScope: "internal" },
  { id: "s3", label: "S3", category: "data", subtitle: "Object storage", icon: "hard-drive", color: "#fb923c", defaultShape: "cylinder", defaultScope: "internal" },
  { id: "kafka", label: "Kafka", category: "messaging", subtitle: "Kafka", icon: "radio", color: "#c084fc", defaultShape: "stadium", defaultScope: "internal" },
  { id: "rabbitmq", label: "RabbitMQ", category: "messaging", subtitle: "Queue", icon: "inbox", color: "#f97316", defaultShape: "stadium", defaultScope: "internal" },
  { id: "load-balancer", label: "Load Balancer", category: "network", subtitle: "Network", icon: "git-fork", color: "#22d3ee", defaultShape: "hexagon", defaultScope: "internal" },
  { id: "api-gateway", label: "API Gateway", category: "network", subtitle: "Gateway", icon: "globe", color: "#a78bfa", defaultShape: "hexagon", defaultScope: "internal" },
  { id: "cdn", label: "CDN", category: "network", subtitle: "Network", icon: "cloud", color: "#38bdf8", defaultShape: "hexagon", defaultScope: "internal" },
  { id: "third-party", label: "Third-party API", category: "external", subtitle: "External", icon: "puzzle", color: "#94a3b8", defaultShape: "rectangle", defaultScope: "external" },
  { id: "user", label: "User", category: "external", subtitle: "Actor", icon: "user", color: "#e2e8f0", defaultShape: "actor", defaultScope: "external" },
  { id: "config-map", label: "Config map", category: "config", subtitle: "Config", icon: "file-code", color: "#67e8f9", defaultShape: "rounded", defaultScope: "internal" },
  { id: "secret", label: "Secret", category: "config", subtitle: "Secret", icon: "key", color: "#f0abfc", defaultShape: "rounded", defaultScope: "internal" },
];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  compute: "Compute",
  data: "Data",
  messaging: "Messaging",
  network: "Network",
  external: "External",
  config: "Config",
};

export const ACCENT_SWATCHES = [
  "#818cf8",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#c084fc",
  "#fb923c",
  "#94a3b8",
  "#e2e8f0",
  "#f472b6",
] as const;

export const TAG_COLOR_PALETTE = [
  "#818cf8",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#c084fc",
  "#fb923c",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
] as const;

export interface TechDefinition {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export const TECH_CATALOG: TechDefinition[] = [
  { id: "nodejs", label: "Node.js", color: "#68a063", icon: "box" },
  { id: "go", label: "Go", color: "#00add8", icon: "zap" },
  { id: "python", label: "Python", color: "#3776ab", icon: "file-code" },
  { id: "typescript", label: "TypeScript", color: "#3178c6", icon: "file-code" },
  { id: "postgres", label: "PostgreSQL", color: "#336791", icon: "database" },
  { id: "redis", label: "Redis", color: "#dc382d", icon: "layers" },
  { id: "kafka", label: "Kafka", color: "#231f20", icon: "radio" },
  { id: "s3", label: "AWS S3", color: "#569a31", icon: "hard-drive" },
  { id: "grpc", label: "gRPC", color: "#244c5a", icon: "git-fork" },
  { id: "http", label: "HTTP", color: "#22d3ee", icon: "globe" },
  { id: "docker", label: "Docker", color: "#2496ed", icon: "box" },
  { id: "k8s", label: "Kubernetes", color: "#326ce5", icon: "cloud" },
  { id: "react", label: "React", color: "#61dafb", icon: "puzzle" },
  { id: "nginx", label: "Nginx", color: "#009639", icon: "globe" },
];

export function emptyMeta(): DiagramMeta {
  return { tagDefs: [], flows: [] };
}

export function nodeTypeById(id: string): NodeTypeDefinition | undefined {
  return NODE_LIBRARY.find((item) => item.id === id);
}

export function techById(id: string): TechDefinition | undefined {
  return TECH_CATALOG.find((item) => item.id === id);
}

export function resolveNodeShape(data: Pick<InfraNodeData, "typeId" | "shape">): NodeShape {
  if (data.shape) return data.shape;
  return nodeTypeById(data.typeId)?.defaultShape ?? "rounded";
}

export function resolveNodeScope(data: Pick<InfraNodeData, "typeId" | "scope">): NodeScope {
  if (data.scope) return data.scope;
  return nodeTypeById(data.typeId)?.defaultScope ?? "internal";
}

export function resolveAccentColor(data: Pick<InfraNodeData, "typeId" | "accentColor">): string {
  if (data.accentColor) return data.accentColor;
  return nodeTypeById(data.typeId)?.color ?? "#818cf8";
}

export function hashTagColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length]!;
}

export function resolveTagColor(label: string, defs: TagDef[]): string {
  const found = defs.find((item) => item.label === label || item.id === label);
  return found?.color ?? hashTagColor(label);
}

export function createInfraNodeData(
  typeId: InfraNodeTypeId,
  extra: Partial<InfraNodeData> = {},
): InfraNodeData {
  const meta = nodeTypeById(typeId);
  return {
    kind: "infra",
    title: extra.title ?? meta?.label ?? typeId,
    typeId,
    subtitle: extra.subtitle ?? meta?.subtitle,
    description: extra.description,
    displayDescription: extra.displayDescription,
    tags: extra.tags ?? [],
    status: extra.status ?? "healthy",
    properties: extra.properties ?? [],
    shape: extra.shape ?? meta?.defaultShape,
    accentColor: extra.accentColor,
    scope: extra.scope ?? meta?.defaultScope,
    lifecycle: extra.lifecycle ?? "live",
    technologies: extra.technologies ?? [],
    childDiagramId: extra.childDiagramId,
    childCount: extra.childCount,
  };
}

export function canEdit(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export function canShare(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}
