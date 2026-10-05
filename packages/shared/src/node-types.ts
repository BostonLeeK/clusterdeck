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

export type DiagramNodeKind = "infra" | "group" | "port";

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
  tags: string[];
  status: NodeStatus;
  properties: NodeProperty[];
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

export type DiagramNodeData = InfraNodeData | GroupNodeData | PortNodeData;

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
}

export interface DiagramSnapshot {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface NodeTypeDefinition {
  id: InfraNodeTypeId;
  label: string;
  category: NodeCategory;
  subtitle: string;
  icon: string;
  color: string;
}

export const NODE_LIBRARY: NodeTypeDefinition[] = [
  { id: "service", label: "Service", category: "compute", subtitle: "Service", icon: "shield", color: "#818cf8" },
  { id: "lambda", label: "Lambda", category: "compute", subtitle: "Function", icon: "zap", color: "#fbbf24" },
  { id: "container", label: "Container", category: "compute", subtitle: "Container", icon: "box", color: "#34d399" },
  { id: "postgres", label: "PostgreSQL", category: "data", subtitle: "Database", icon: "database", color: "#60a5fa" },
  { id: "redis", label: "Redis", category: "data", subtitle: "Cache", icon: "layers", color: "#f87171" },
  { id: "s3", label: "S3", category: "data", subtitle: "Object storage", icon: "hard-drive", color: "#fb923c" },
  { id: "kafka", label: "Kafka", category: "messaging", subtitle: "Kafka", icon: "radio", color: "#c084fc" },
  { id: "rabbitmq", label: "RabbitMQ", category: "messaging", subtitle: "Queue", icon: "inbox", color: "#f97316" },
  { id: "load-balancer", label: "Load Balancer", category: "network", subtitle: "Network", icon: "git-fork", color: "#22d3ee" },
  { id: "api-gateway", label: "API Gateway", category: "network", subtitle: "Gateway", icon: "globe", color: "#a78bfa" },
  { id: "cdn", label: "CDN", category: "network", subtitle: "Network", icon: "cloud", color: "#38bdf8" },
  { id: "third-party", label: "Third-party API", category: "external", subtitle: "External", icon: "puzzle", color: "#94a3b8" },
  { id: "user", label: "User", category: "external", subtitle: "Actor", icon: "user", color: "#e2e8f0" },
  { id: "config-map", label: "Config map", category: "config", subtitle: "Config", icon: "file-code", color: "#67e8f9" },
  { id: "secret", label: "Secret", category: "config", subtitle: "Secret", icon: "key", color: "#f0abfc" },
];

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  compute: "Compute",
  data: "Data",
  messaging: "Messaging",
  network: "Network",
  external: "External",
  config: "Config",
};

export function nodeTypeById(id: string): NodeTypeDefinition | undefined {
  return NODE_LIBRARY.find((item) => item.id === id);
}

export function canEdit(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "editor";
}

export function canShare(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}
