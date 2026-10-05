import {
  createInfraNodeData,
  emptyMeta,
  type DiagramSnapshot,
  type InfraNodeData,
  type InfraNodeTypeId,
} from "./node-types";

function infra(
  id: string,
  title: string,
  typeId: InfraNodeTypeId,
  x: number,
  y: number,
  extra: Partial<InfraNodeData> = {},
) {
  return {
    id,
    type: "infra" as const,
    position: { x, y },
    data: createInfraNodeData(typeId, { title, ...extra }),
  };
}

export const PROJECT_TEMPLATES = [
  {
    id: "blank",
    name: "Blank diagram",
    description: "Empty canvas to start from scratch.",
    tags: ["empty"],
    snapshot: { nodes: [], edges: [], meta: emptyMeta() } satisfies DiagramSnapshot,
  },
  {
    id: "web-api",
    name: "Web API",
    description: "Client, gateway, service, cache and database.",
    tags: ["api", "web"],
    snapshot: {
      nodes: [
        infra("client", "Web client", "user", 40, 140, {
          subtitle: "Browser",
          displayDescription: "End users in the browser",
          technologies: ["react"],
        }),
        infra("gateway", "API gateway", "api-gateway", 280, 140, {
          subtitle: "HTTPS · ingress",
          displayDescription: "Public entrypoint",
          technologies: ["nginx", "http"],
          tags: ["edge"],
        }),
        infra("auth", "Auth service", "service", 540, 40, {
          subtitle: "gRPC · core",
          displayDescription: "Issues JWT sessions",
          technologies: ["nodejs", "grpc"],
          tags: ["core"],
        }),
        infra("api", "API service", "service", 540, 220, {
          subtitle: "REST",
          displayDescription: "Business API",
          technologies: ["nodejs", "http"],
          tags: ["core"],
        }),
        infra("redis", "Redis", "redis", 800, 40, {
          subtitle: "Cache",
          technologies: ["redis"],
        }),
        infra("db", "PostgreSQL", "postgres", 800, 220, {
          subtitle: "Primary data",
          technologies: ["postgres"],
        }),
      ],
      edges: [
        { id: "e1", source: "client", target: "gateway", label: "HTTPS", animated: true },
        { id: "e2", source: "gateway", target: "auth", label: "gRPC" },
        { id: "e3", source: "gateway", target: "api", label: "HTTP" },
        { id: "e4", source: "auth", target: "redis", label: "cache" },
        { id: "e5", source: "api", target: "db", label: "SQL" },
      ],
      meta: {
        tagDefs: [
          { id: "edge", label: "edge", color: "#22d3ee" },
          { id: "core", label: "core", color: "#818cf8" },
        ],
        flows: [
          {
            id: "auth-login",
            name: "Login",
            color: "#34d399",
            edgeIds: ["e1", "e2", "e4"],
          },
        ],
      },
    } satisfies DiagramSnapshot,
  },
  {
    id: "data-pipeline",
    name: "Data pipeline",
    description: "Events from workers into Kafka, warehouse and object storage.",
    tags: ["data", "events"],
    snapshot: {
      nodes: [
        infra("producer", "Event worker", "lambda", 40, 120, {
          subtitle: "Producer",
          technologies: ["python"],
        }),
        infra("kafka", "Kafka", "kafka", 300, 120, {
          subtitle: "Events",
          technologies: ["kafka"],
          tags: ["stream"],
        }),
        infra("worker", "Stream worker", "container", 560, 120, {
          subtitle: "Consumer",
          technologies: ["go", "docker"],
          tags: ["stream"],
        }),
        infra("s3", "S3", "s3", 820, 40, {
          subtitle: "Lake",
          technologies: ["s3"],
        }),
        infra("warehouse", "PostgreSQL", "postgres", 820, 200, {
          subtitle: "Warehouse",
          technologies: ["postgres"],
        }),
      ],
      edges: [
        { id: "e1", source: "producer", target: "kafka", label: "events", animated: true },
        { id: "e2", source: "kafka", target: "worker", label: "consume", animated: true },
        { id: "e3", source: "worker", target: "s3", label: "parquet" },
        { id: "e4", source: "worker", target: "warehouse", label: "SQL" },
      ],
      meta: {
        tagDefs: [{ id: "stream", label: "stream", color: "#c084fc" }],
        flows: [
          {
            id: "ingest",
            name: "Ingest",
            color: "#22d3ee",
            edgeIds: ["e1", "e2", "e3"],
          },
        ],
      },
    } satisfies DiagramSnapshot,
  },
  {
    id: "k8s-prod",
    name: "K8s production",
    description: "CDN, load balancer, cluster services and data stores.",
    tags: ["k8s", "prod"],
    snapshot: {
      nodes: [
        infra("cdn", "edge-cdn", "cdn", 40, 40, {
          subtitle: "Network",
          technologies: ["http"],
          tags: ["edge"],
        }),
        infra("lb", "load-balancer", "load-balancer", 280, 40, {
          subtitle: "ALB",
          tags: ["edge"],
        }),
        infra("gw", "api-gateway", "api-gateway", 520, 40, {
          subtitle: "Ingress",
          technologies: ["k8s", "nginx"],
          tags: ["edge"],
        }),
        infra("auth", "auth-service", "service", 280, 200, {
          subtitle: "Service",
          technologies: ["nodejs", "grpc"],
          tags: ["core"],
          displayDescription: "AuthN / AuthZ",
        }),
        infra("billing", "billing-service", "service", 520, 200, {
          subtitle: "Service",
          technologies: ["go"],
          tags: ["core"],
        }),
        infra("redis", "redis-cache", "redis", 280, 360, {
          subtitle: "Cache",
          technologies: ["redis"],
        }),
        infra("pg", "postgres-main", "postgres", 520, 360, {
          subtitle: "Database",
          technologies: ["postgres"],
        }),
      ],
      edges: [
        { id: "e1", source: "cdn", target: "lb", label: "HTTPS" },
        { id: "e2", source: "lb", target: "gw", label: "HTTP" },
        { id: "e3", source: "gw", target: "auth", label: "gRPC" },
        { id: "e4", source: "gw", target: "billing", label: "HTTP" },
        { id: "e5", source: "auth", target: "redis", label: "cache" },
        { id: "e6", source: "billing", target: "pg", label: "SQL" },
      ],
      meta: {
        tagDefs: [
          { id: "edge", label: "edge", color: "#22d3ee" },
          { id: "core", label: "core", color: "#818cf8" },
        ],
        flows: [
          {
            id: "request",
            name: "Request path",
            color: "#fbbf24",
            edgeIds: ["e1", "e2", "e3", "e5"],
          },
        ],
      },
    } satisfies DiagramSnapshot,
  },
] as const;

export type ProjectTemplateId = (typeof PROJECT_TEMPLATES)[number]["id"];

export function templateById(id: string) {
  return PROJECT_TEMPLATES.find((item) => item.id === id);
}
