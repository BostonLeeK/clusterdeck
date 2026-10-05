import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import type { DiagramSnapshot, InfraNodeData } from "@dataflow/shared";
import { db } from "./client";
import {
  diagrams,
  projectMembers,
  projectTags,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from "./schema";

function infra(
  id: string,
  title: string,
  typeId: InfraNodeData["typeId"],
  x: number,
  y: number,
  extra: Partial<InfraNodeData> & { parentId?: string; width?: number; height?: number } = {},
) {
  const { parentId, width, height, ...data } = extra;
  return {
    id,
    type: "infra" as const,
    position: { x, y },
    parentId,
    width,
    height,
    data: {
      kind: "infra" as const,
      title,
      typeId,
      subtitle: data.subtitle,
      description: data.description,
      tags: data.tags ?? [],
      status: data.status ?? "healthy",
      properties: data.properties ?? [],
      childDiagramId: data.childDiagramId,
      childCount: data.childCount,
    },
  };
}

const prodSnapshot: DiagramSnapshot = {
  nodes: [
    infra("client", "client", "user", 40, 80, { subtitle: "Web application" }),
    infra("edge-cdn", "edge-cdn", "cdn", 280, 20, { subtitle: "CloudFront · Network" }),
    infra("load-balancer", "load-balancer", "load-balancer", 520, 20, {
      subtitle: "Application · ALB",
    }),
    infra("api-gateway", "api-gateway", "api-gateway", 760, 80, {
      subtitle: "Amazon API Gateway",
    }),
    {
      id: "k8s-prod-cluster",
      type: "group",
      position: { x: 180, y: 180 },
      width: 720,
      height: 420,
      data: {
        kind: "group",
        title: "k8s-prod-cluster",
        subtitle: "eu-central-1 · 6 resources",
        tags: [],
        childCount: 6,
      },
    },
    infra("auth-service", "auth-service", "service", 40, 70, {
      parentId: "k8s-prod-cluster",
      subtitle: "Node.js · Service",
      tags: ["prod", "core", "internal"],
      childCount: 6,
      description: "Authentication service. Validates user sessions and issues access tokens.",
      properties: [
        { key: "Owner", value: "Team Core" },
        { key: "Repo", value: "github.com/dev/auth" },
        { key: "Port", value: "8080" },
        { key: "Environment", value: "prod" },
      ],
    }),
    infra("billing-service", "billing-service", "service", 360, 70, {
      parentId: "k8s-prod-cluster",
      subtitle: "Node.js · Service",
      tags: ["payments", "prod"],
    }),
    infra("worker", "worker", "container", 40, 200, {
      parentId: "k8s-prod-cluster",
      subtitle: "Background job · Container",
      tags: ["queue", "prod"],
    }),
    infra("kafka-events", "kafka-events", "kafka", 360, 200, {
      parentId: "k8s-prod-cluster",
      subtitle: "Amazon MSK · Kafka",
      tags: ["events", "prod"],
    }),
    infra("redis-cache", "redis-cache", "redis", 40, 320, {
      parentId: "k8s-prod-cluster",
      subtitle: "Redis · Cache",
      tags: ["cache", "prod"],
    }),
    infra("postgres-main", "postgres-main", "postgres", 360, 320, {
      parentId: "k8s-prod-cluster",
      subtitle: "PostgreSQL · Database",
      tags: ["primary", "prod"],
    }),
  ],
  edges: [
    { id: "e1", source: "client", target: "edge-cdn", label: "HTTPS" },
    { id: "e2", source: "edge-cdn", target: "load-balancer" },
    { id: "e3", source: "load-balancer", target: "api-gateway" },
    { id: "e4", source: "api-gateway", target: "auth-service", label: "HTTPS" },
    { id: "e5", source: "auth-service", target: "billing-service" },
    { id: "e6", source: "auth-service", target: "worker", label: "gRPC" },
    { id: "e7", source: "worker", target: "kafka-events", label: "events" },
    { id: "e8", source: "kafka-events", target: "postgres-main" },
    { id: "e9", source: "billing-service", target: "postgres-main", label: "SQL" },
    { id: "e10", source: "auth-service", target: "redis-cache", label: "gRPC" },
  ],
};

const authInner: DiagramSnapshot = {
  nodes: [
    {
      id: "port-in-gw",
      type: "port",
      position: { x: 20, y: 180 },
      data: {
        kind: "port",
        title: "api-gateway",
        direction: "in",
        protocol: "HTTPS",
        parentNodeId: "auth-service",
        parentEdgeId: "e4",
      },
    },
    {
      id: "port-out-pg",
      type: "port",
      position: { x: 720, y: 180 },
      data: {
        kind: "port",
        title: "postgres-main",
        direction: "out",
        protocol: "SQL",
        parentNodeId: "auth-service",
        parentEdgeId: "e9",
      },
    },
    infra("auth-api-7d9f", "auth-api-7d9f", "container", 180, 60, {
      subtitle: "Pod · 2 replicas",
      tags: ["api", "healthy"],
    }),
    infra("auth-worker-6cc8", "auth-worker-6cc8", "container", 180, 240, {
      subtitle: "Pod · 1 replica",
      tags: ["worker", "healthy"],
    }),
    infra("redis-inner", "Redis cache", "redis", 420, 40, {
      subtitle: "Redis · 7.2",
      tags: ["session", "6379"],
      description: "Shared session and token cache for auth pods.",
      properties: [
        { key: "Engine", value: "Redis 7.2" },
        { key: "Endpoint", value: "redis.internal:6379" },
        { key: "Database", value: "0" },
        { key: "Environment", value: "prod" },
      ],
    }),
    infra("envoy", "Envoy sidecar", "service", 420, 240, {
      subtitle: "Proxy · v1.29",
      tags: ["mTLS"],
    }),
    infra("config", "Config map", "config-map", 620, 40, {
      subtitle: "auth-config",
      tags: ["mounted"],
    }),
    infra("secret", "Secret", "secret", 620, 240, {
      subtitle: "jwt-signing",
      tags: ["encrypted"],
    }),
  ],
  edges: [
    { id: "i1", source: "port-in-gw", target: "auth-api-7d9f", label: "HTTPS" },
    { id: "i2", source: "auth-api-7d9f", target: "redis-inner", label: "TCP · 6379" },
    { id: "i3", source: "auth-api-7d9f", target: "envoy", label: "mTLS" },
    { id: "i4", source: "auth-worker-6cc8", target: "redis-inner", label: "TCP" },
    { id: "i5", source: "auth-worker-6cc8", target: "envoy", label: "mTLS" },
    { id: "i6", source: "config", target: "auth-api-7d9f" },
    { id: "i7", source: "secret", target: "envoy" },
    { id: "i8", source: "envoy", target: "port-out-pg", label: "SQL" },
  ],
};

async function main() {
  const email = "bohdan@dev";
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) {
    console.log("seed already applied");
    return;
  }

  const passwordHash = await hash("password123", {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const [user] = await db
    .insert(users)
    .values({
      name: "Bohdan",
      email,
      passwordHash,
      image: null,
    })
    .returning();
  if (!user) throw new Error("failed to insert user");

  const [workspace] = await db.insert(workspaces).values({ name: "Dev Team" }).returning();
  if (!workspace) throw new Error("failed to insert workspace");

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: workspace.id,
      ownerId: user.id,
      name: "Production Infrastructure",
      description: "Main production environment with auth-service, api-gateway, worker, postgres-main, redis-cache and k8s-prod-cluster.",
      kind: "shared",
    })
    .returning();
  if (!project) throw new Error("failed to insert project");

  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: user.id,
    role: "owner",
  });
  await db.insert(projectTags).values([
    { projectId: project.id, name: "aws", color: "#fbbf24" },
    { projectId: project.id, name: "k8s", color: "#818cf8" },
    { projectId: project.id, name: "prod", color: "#34d399" },
  ]);

  const [root] = await db
    .insert(diagrams)
    .values({
      projectId: project.id,
      name: "AWS eu-central-1",
      snapshot: prodSnapshot,
    })
    .returning();
  if (!root) throw new Error("failed to insert diagram");

  const [inner] = await db
    .insert(diagrams)
    .values({
      projectId: project.id,
      parentDiagramId: root.id,
      parentNodeId: "auth-service",
      name: "auth-service",
      snapshot: authInner,
    })
    .returning();
  if (!inner) throw new Error("failed to insert inner diagram");

  const nodes = prodSnapshot.nodes.map((node) => {
    if (node.id !== "auth-service" || node.data.kind !== "infra") return node;
    return {
      ...node,
      data: { ...node.data, childDiagramId: inner.id, childCount: 6 },
    };
  });
  await db
    .update(diagrams)
    .set({ snapshot: { ...prodSnapshot, nodes } })
    .where(eq(diagrams.id, root.id));

  const extras: Array<{
    name: string;
    description: string;
    kind: "personal" | "shared";
    tags: { name: string; color: string }[];
    snapshot: DiagramSnapshot;
  }> = [
    {
      name: "Payment Platform",
      description: "Payment platform with payment-service, billing-service, notification-service, stripe and postgres-main.",
      kind: "personal",
      tags: [
        { name: "payments", color: "#c084fc" },
        { name: "stripe", color: "#818cf8" },
        { name: "nodejs", color: "#34d399" },
      ],
      snapshot: {
        nodes: [
          infra("web", "Web App", "user", 0, 80, { subtitle: "Frontend" }),
          infra("pay", "payment-service", "service", 180, 20, { subtitle: "Node.js" }),
          infra("bill", "billing-service", "service", 180, 90, { subtitle: "Node.js" }),
          infra("note", "notification-service", "service", 180, 160, { subtitle: "Worker" }),
          infra("stripe", "Stripe", "third-party", 360, 20, { subtitle: "Payments" }),
          infra("pg", "postgres-main", "postgres", 360, 120, { subtitle: "PostgreSQL" }),
        ],
        edges: [
          { id: "a", source: "web", target: "pay" },
          { id: "b", source: "web", target: "bill" },
          { id: "c", source: "web", target: "note" },
          { id: "d", source: "pay", target: "stripe" },
          { id: "e", source: "bill", target: "pg" },
        ],
      },
    },
    {
      name: "Data Pipeline",
      description: "Event streaming pipeline with kafka-events, data-processor, clickhouse, s3-data-lake and redshift.",
      kind: "shared",
      tags: [
        { name: "kafka", color: "#c084fc" },
        { name: "analytics", color: "#60a5fa" },
        { name: "clickhouse", color: "#fbbf24" },
      ],
      snapshot: {
        nodes: [
          infra("events", "Events", "user", 0, 80, { subtitle: "Sources" }),
          infra("kafka", "kafka-events", "kafka", 180, 20, { subtitle: "Kafka" }),
          infra("proc", "data-processor", "service", 180, 90, { subtitle: "Python" }),
          infra("s3", "s3-data-lake", "s3", 180, 160, { subtitle: "S3" }),
          infra("ch", "clickhouse", "postgres", 360, 40, { subtitle: "Analytics" }),
          infra("rs", "redshift", "postgres", 360, 130, { subtitle: "Data Warehouse" }),
        ],
        edges: [
          { id: "a", source: "events", target: "kafka" },
          { id: "b", source: "events", target: "proc" },
          { id: "c", source: "events", target: "s3" },
          { id: "d", source: "kafka", target: "ch" },
          { id: "e", source: "proc", target: "rs" },
        ],
      },
    },
    {
      name: "Staging Env",
      description: "Staging environment with frontend, backend, postgres-staging, redis-staging and ingress.",
      kind: "personal",
      tags: [
        { name: "k8s", color: "#60a5fa" },
        { name: "staging", color: "#c084fc" },
        { name: "test", color: "#34d399" },
      ],
      snapshot: {
        nodes: [
          infra("users", "Users", "user", 0, 80),
          infra("fe", "frontend", "service", 180, 30, { subtitle: "Next.js" }),
          infra("be", "backend", "service", 180, 100, { subtitle: "Node.js" }),
          infra("ing", "ingress", "api-gateway", 180, 170, { subtitle: "Nginx" }),
          infra("pg", "postgres-staging", "postgres", 360, 40, { subtitle: "PostgreSQL" }),
          infra("redis", "redis-staging", "redis", 360, 130, { subtitle: "Redis" }),
        ],
        edges: [
          { id: "a", source: "users", target: "fe" },
          { id: "b", source: "users", target: "be" },
          { id: "c", source: "users", target: "ing" },
          { id: "d", source: "be", target: "pg" },
          { id: "e", source: "be", target: "redis" },
        ],
      },
    },
    {
      name: "Mobile Infrastructure",
      description: "Mobile infrastructure with mobile-api, auth-service, postgres-main, cache and firebase-push.",
      kind: "shared",
      tags: [
        { name: "mobile", color: "#c084fc" },
        { name: "prod", color: "#60a5fa" },
      ],
      snapshot: {
        nodes: [
          infra("app", "Mobile App", "user", 0, 80),
          infra("api", "mobile-api", "service", 180, 30, { subtitle: "Node.js" }),
          infra("auth", "auth-service", "service", 180, 130, { subtitle: "Node.js" }),
          infra("pg", "postgres-main", "postgres", 360, 20, { subtitle: "PostgreSQL" }),
          infra("cache", "cache", "redis", 360, 90, { subtitle: "Redis" }),
          infra("push", "firebase-push", "third-party", 360, 160, { subtitle: "Firebase" }),
        ],
        edges: [
          { id: "a", source: "app", target: "api" },
          { id: "b", source: "app", target: "auth" },
          { id: "c", source: "api", target: "pg" },
          { id: "d", source: "api", target: "cache" },
          { id: "e", source: "api", target: "push" },
        ],
      },
    },
  ];

  for (const extra of extras) {
    const [item] = await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        ownerId: user.id,
        name: extra.name,
        description: extra.description,
        kind: extra.kind,
      })
      .returning();
    if (!item) continue;
    await db.insert(projectMembers).values({ projectId: item.id, userId: user.id, role: "owner" });
    if (extra.tags.length) {
      await db.insert(projectTags).values(extra.tags.map((tag) => ({ projectId: item.id, ...tag })));
    }
    await db.insert(diagrams).values({ projectId: item.id, name: extra.name, snapshot: extra.snapshot });
  }

  console.log("seed complete");
  console.log("login:", email, "/ password123");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
