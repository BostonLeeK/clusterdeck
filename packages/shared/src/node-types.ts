export const NODE_CATEGORIES = ["compute", "data", "model", "messaging", "network", "external", "observability", "config"] as const;

export type NodeCategory = (typeof NODE_CATEGORIES)[number];

export const NODE_TYPE_IDS = [
  "service",
  "lambda",
  "container",
  "worker",
  "cron",
  "postgres",
  "redis",
  "s3",
  "storage",
  "search",
  "table",
  "custom",
  "kafka",
  "rabbitmq",
  "queue",
  "load-balancer",
  "api-gateway",
  "cdn",
  "third-party",
  "user",
  "auth",
  "logs",
  "metrics",
  "alerts",
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
  id: string;
  key: string;
  value: string;
  icon?: string;
  showOnCanvas?: boolean;
}

export function createNodeProperty(
  partial: Partial<NodeProperty> & Pick<NodeProperty, "key"> = { key: "" },
): NodeProperty {
  return {
    id: partial.id ?? crypto.randomUUID(),
    key: partial.key,
    value: partial.value ?? "",
    icon: partial.icon,
    showOnCanvas: partial.showOnCanvas !== false,
  };
}

export function normalizeNodeProperties(
  properties: Array<Partial<NodeProperty> & Pick<NodeProperty, "key" | "value">> | undefined,
): NodeProperty[] {
  return (properties ?? []).map((property) =>
    createNodeProperty({
      id: property.id,
      key: property.key ?? "",
      value: property.value ?? "",
      icon: property.icon,
      showOnCanvas: property.showOnCanvas,
    }),
  );
}

export type ConnectorDirection = "in" | "out";

export interface NodeConnector {
  nodeId: string;
  title: string;
  direction: ConnectorDirection;
}

export function connectorHandleId(direction: ConnectorDirection, nodeId: string) {
  return `${direction}:${nodeId}`;
}

export function parseConnectorHandle(handle: string | null | undefined) {
  const match = handle?.match(/^(in|out):(.+)$/);
  if (!match) return null;
  return { direction: match[1] as ConnectorDirection, nodeId: match[2]! };
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
  connectors?: NodeConnector[];
  [key: string]: unknown;
}

export interface GroupNodeData {
  kind: "group";
  title: string;
  subtitle?: string;
  tags: string[];
  childCount?: number;
  connectors?: NodeConnector[];
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
  { id: "worker", label: "Worker", category: "compute", subtitle: "Worker", icon: "cog", color: "#2dd4bf", defaultShape: "rounded", defaultScope: "internal" },
  { id: "cron", label: "Cron", category: "compute", subtitle: "Schedule", icon: "clock", color: "#eab308", defaultShape: "rounded", defaultScope: "internal" },
  { id: "postgres", label: "PostgreSQL", category: "data", subtitle: "Database", icon: "database", color: "#60a5fa", defaultShape: "rounded", defaultScope: "internal" },
  { id: "redis", label: "Redis", category: "data", subtitle: "Cache", icon: "layers", color: "#f87171", defaultShape: "rounded", defaultScope: "internal" },
  { id: "s3", label: "S3", category: "data", subtitle: "Object storage", icon: "hard-drive", color: "#fb923c", defaultShape: "rounded", defaultScope: "internal" },
  { id: "storage", label: "Storage", category: "data", subtitle: "Storage", icon: "archive", color: "#d6d3d1", defaultShape: "rounded", defaultScope: "internal" },
  { id: "search", label: "Search", category: "data", subtitle: "Search", icon: "search", color: "#14b8a6", defaultShape: "rounded", defaultScope: "internal" },
  { id: "table", label: "Table", category: "model", subtitle: "Table", icon: "table", color: "#93c5fd", defaultShape: "rectangle", defaultScope: "internal" },
  { id: "custom", label: "Custom", category: "model", subtitle: "Custom", icon: "shapes", color: "#fde68a", defaultShape: "rounded", defaultScope: "internal" },
  { id: "kafka", label: "Kafka", category: "messaging", subtitle: "Kafka", icon: "radio", color: "#c084fc", defaultShape: "rounded", defaultScope: "internal" },
  { id: "rabbitmq", label: "RabbitMQ", category: "messaging", subtitle: "Queue", icon: "inbox", color: "#f97316", defaultShape: "rounded", defaultScope: "internal" },
  { id: "queue", label: "Queue", category: "messaging", subtitle: "Queue", icon: "list-ordered", color: "#fb7185", defaultShape: "rounded", defaultScope: "internal" },
  { id: "load-balancer", label: "Load Balancer", category: "network", subtitle: "Network", icon: "git-fork", color: "#22d3ee", defaultShape: "rounded", defaultScope: "internal" },
  { id: "api-gateway", label: "API Gateway", category: "network", subtitle: "Gateway", icon: "globe", color: "#a78bfa", defaultShape: "rounded", defaultScope: "internal" },
  { id: "cdn", label: "CDN", category: "network", subtitle: "Network", icon: "cloud", color: "#38bdf8", defaultShape: "rounded", defaultScope: "internal" },
  { id: "third-party", label: "Third-party API", category: "external", subtitle: "External", icon: "puzzle", color: "#94a3b8", defaultShape: "rounded", defaultScope: "external" },
  { id: "user", label: "User", category: "external", subtitle: "Actor", icon: "user", color: "#e2e8f0", defaultShape: "rounded", defaultScope: "external" },
  { id: "auth", label: "Auth", category: "external", subtitle: "Identity", icon: "fingerprint", color: "#f472b6", defaultShape: "rounded", defaultScope: "external" },
  { id: "logs", label: "Logs", category: "observability", subtitle: "Logs", icon: "scroll-text", color: "#a1a1aa", defaultShape: "rounded", defaultScope: "internal" },
  { id: "metrics", label: "Metrics", category: "observability", subtitle: "Metrics", icon: "activity", color: "#7dd3fc", defaultShape: "rounded", defaultScope: "internal" },
  { id: "alerts", label: "Alerts", category: "observability", subtitle: "Alerts", icon: "bell", color: "#f43f5e", defaultShape: "rounded", defaultScope: "internal" },
  { id: "config-map", label: "Config map", category: "config", subtitle: "Config", icon: "file-code", color: "#67e8f9", defaultShape: "rounded", defaultScope: "internal" },
  { id: "secret", label: "Secret", category: "config", subtitle: "Secret", icon: "key", color: "#f0abfc", defaultShape: "rounded", defaultScope: "internal" },
];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  compute: "Compute",
  data: "Data",
  model: "Model",
  messaging: "Messaging",
  network: "Network",
  external: "External",
  observability: "Observability",
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
  { id: "typescript", label: "TypeScript", color: "#3178c6", icon: "file-code" },
  { id: "javascript", label: "JavaScript", color: "#f7df1e", icon: "file-code" },
  { id: "go", label: "Go", color: "#00add8", icon: "zap" },
  { id: "python", label: "Python", color: "#3776ab", icon: "file-code" },
  { id: "java", label: "Java", color: "#f89820", icon: "file-code" },
  { id: "kotlin", label: "Kotlin", color: "#7f52ff", icon: "file-code" },
  { id: "csharp", label: "C#", color: "#68217a", icon: "file-code" },
  { id: "rust", label: "Rust", color: "#dea584", icon: "file-code" },
  { id: "ruby", label: "Ruby", color: "#cc342d", icon: "file-code" },
  { id: "php", label: "PHP", color: "#777bb4", icon: "file-code" },
  { id: "elixir", label: "Elixir", color: "#a15ee5", icon: "file-code" },
  { id: "swift", label: "Swift", color: "#f05138", icon: "file-code" },
  { id: "react", label: "React", color: "#61dafb", icon: "puzzle" },
  { id: "nextjs", label: "Next.js", color: "#e2e8f0", icon: "puzzle" },
  { id: "vue", label: "Vue", color: "#42b883", icon: "puzzle" },
  { id: "angular", label: "Angular", color: "#dd0031", icon: "puzzle" },
  { id: "svelte", label: "Svelte", color: "#ff3e00", icon: "puzzle" },
  { id: "nestjs", label: "NestJS", color: "#e0234e", icon: "box" },
  { id: "spring", label: "Spring", color: "#6db33f", icon: "box" },
  { id: "django", label: "Django", color: "#44b78b", icon: "box" },
  { id: "fastapi", label: "FastAPI", color: "#009688", icon: "zap" },
  { id: "dotnet", label: ".NET", color: "#512bd4", icon: "box" },
  { id: "postgres", label: "PostgreSQL", color: "#336791", icon: "database" },
  { id: "mysql", label: "MySQL", color: "#4479a1", icon: "database" },
  { id: "sqlite", label: "SQLite", color: "#0f80cc", icon: "database" },
  { id: "mongodb", label: "MongoDB", color: "#47a248", icon: "database" },
  { id: "redis", label: "Redis", color: "#dc382d", icon: "layers" },
  { id: "elasticsearch", label: "Elasticsearch", color: "#3ecfb2", icon: "search" },
  { id: "opensearch", label: "OpenSearch", color: "#005eb8", icon: "search" },
  { id: "clickhouse", label: "ClickHouse", color: "#ffcc00", icon: "database" },
  { id: "dynamodb", label: "DynamoDB", color: "#4053d6", icon: "database" },
  { id: "cassandra", label: "Cassandra", color: "#1287b1", icon: "database" },
  { id: "snowflake", label: "Snowflake", color: "#29b5e8", icon: "database" },
  { id: "kafka", label: "Kafka", color: "#231f20", icon: "radio" },
  { id: "rabbitmq", label: "RabbitMQ", color: "#ff6600", icon: "inbox" },
  { id: "nats", label: "NATS", color: "#27aae1", icon: "radio" },
  { id: "sqs", label: "Amazon SQS", color: "#ff4f8b", icon: "inbox" },
  { id: "s3", label: "AWS S3", color: "#569a31", icon: "hard-drive" },
  { id: "gcs", label: "Cloud Storage", color: "#4285f4", icon: "hard-drive" },
  { id: "minio", label: "MinIO", color: "#c72e49", icon: "archive" },
  { id: "docker", label: "Docker", color: "#2496ed", icon: "box" },
  { id: "k8s", label: "Kubernetes", color: "#326ce5", icon: "cloud" },
  { id: "helm", label: "Helm", color: "#0f1689", icon: "cloud" },
  { id: "nginx", label: "Nginx", color: "#009639", icon: "globe" },
  { id: "terraform", label: "Terraform", color: "#7b42bc", icon: "cog" },
  { id: "aws", label: "AWS", color: "#ff9900", icon: "cloud" },
  { id: "gcp", label: "Google Cloud", color: "#4285f4", icon: "cloud" },
  { id: "azure", label: "Azure", color: "#0078d4", icon: "cloud" },
  { id: "http", label: "HTTP", color: "#22d3ee", icon: "globe" },
  { id: "grpc", label: "gRPC", color: "#244c5a", icon: "git-fork" },
  { id: "graphql", label: "GraphQL", color: "#e10098", icon: "git-fork" },
  { id: "websocket", label: "WebSocket", color: "#38bdf8", icon: "globe" },
  { id: "prometheus", label: "Prometheus", color: "#e6522c", icon: "activity" },
  { id: "grafana", label: "Grafana", color: "#f46800", icon: "activity" },
  { id: "otel", label: "OpenTelemetry", color: "#f5a800", icon: "activity" },
  { id: "loki", label: "Loki", color: "#f9a66c", icon: "scroll-text" },
  { id: "sentry", label: "Sentry", color: "#8d5494", icon: "bell" },
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
    properties: normalizeNodeProperties(extra.properties),
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

export function canManageWorkspace(role: WorkspaceRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
