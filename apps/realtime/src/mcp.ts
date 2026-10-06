import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Hocuspocus } from "@hocuspocus/server";
import { and, desc, eq, exists, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, diagrams, projectMembers, projects, users, workspaceMembers } from "@dataflow/db";
import { diagramAgentInstructions, snapshotFromDoc } from "@dataflow/shared";
import { canEditProject, projectRole } from "./access";
import { applyDiagramEdits, type EdgeInput, type NodeInput } from "./mcp-edit";

const nodeInput = z.object({
  id: z.string().optional(),
  kind: z.enum(["infra", "group", "note", "port"]).optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  parentId: z.string().nullable().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  typeId: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  displayDescription: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["healthy", "degraded", "unknown", "offline"]).optional(),
  shape: z.enum(["rounded", "rectangle", "cylinder", "hexagon", "actor", "stadium"]).optional(),
  scope: z.enum(["internal", "external"]).optional(),
  lifecycle: z.enum(["live", "future", "deprecated", "removed"]).optional(),
  technologies: z.array(z.string()).optional(),
  body: z.string().optional(),
  tone: z.enum(["text", "comment"]).optional(),
  direction: z.enum(["in", "out"]).optional(),
  protocol: z.string().optional(),
  parentNodeId: z.string().optional(),
  parentEdgeId: z.string().optional(),
});

const edgeInput = z.object({
  id: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  label: z.string().optional(),
  animated: z.boolean().optional(),
  lineShape: z.enum(["bezier", "straight", "step"]).optional(),
});

async function userIdFromHeader(header: string | undefined) {
  const token = header?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.mcpTokenHash, hash)).limit(1);
  return user?.id ?? null;
}

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "request failed";
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

async function withDiagram<T>(hocuspocus: Hocuspocus, diagramId: string, run: (doc: Parameters<typeof snapshotFromDoc>[0]) => T): Promise<T> {
  const connection = await hocuspocus.openDirectConnection(diagramId, {
    userId: "mcp",
    role: "editor",
    diagramId,
  });
  try {
    let result!: T;
    await connection.transact((document) => {
      result = run(document);
    });
    connection.document?.broadcastStateless(JSON.stringify({ type: "mcp", active: true }));
    return result;
  } finally {
    await connection.disconnect();
  }
}

function visibleProjects(userId: string) {
  const member = exists(
    db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId))),
  );
  const workspaceMember = exists(
    db
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, projects.workspaceId), eq(workspaceMembers.userId, userId))),
  );
  return and(isNull(projects.deletedAt), or(eq(projects.ownerId, userId), member, workspaceMember));
}

function createMcp(hocuspocus: Hocuspocus, userId: string) {
  const server = new McpServer(
    { name: "clusterdeck", version: "0.1.0" },
    { instructions: diagramAgentInstructions() },
  );

  server.registerTool(
    "list_diagrams",
    {
      description: "List diagrams this token is allowed to open. Access is off until someone enables the diagram. Use the returned id with get_diagram and update_diagram.",
      inputSchema: z.object({ query: z.string().optional() }),
    },
    async ({ query }) => {
      const needle = query?.trim().toLowerCase();
      const rows = await db
        .select({
          id: diagrams.id,
          name: diagrams.name,
          projectId: diagrams.projectId,
          projectName: projects.name,
          parentDiagramId: diagrams.parentDiagramId,
          updatedAt: diagrams.updatedAt,
        })
        .from(diagrams)
        .innerJoin(projects, eq(diagrams.projectId, projects.id))
        .where(and(visibleProjects(userId), eq(diagrams.mcpEnabled, true)))
        .orderBy(desc(diagrams.updatedAt))
        .limit(200);
      const items = needle
        ? rows.filter((row) => `${row.name} ${row.projectName}`.toLowerCase().includes(needle))
        : rows;
      return text(items);
    },
  );

  server.registerTool(
    "get_diagram",
    {
      description: "Read one diagram, including nodes, edges, and meta.",
      inputSchema: z.object({ diagramId: z.string() }),
    },
    async ({ diagramId }) => {
      try {
        const [row] = await db
          .select({
            id: diagrams.id,
            name: diagrams.name,
            projectId: diagrams.projectId,
            parentDiagramId: diagrams.parentDiagramId,
            mcpEnabled: diagrams.mcpEnabled,
          })
          .from(diagrams)
          .where(eq(diagrams.id, diagramId))
          .limit(1);
        if (!row?.mcpEnabled) return failure(new Error("diagram not found"));
        const role = await projectRole(row.projectId, userId);
        if (!role) return failure(new Error("diagram not found"));
        const snapshot = await withDiagram(hocuspocus, diagramId, (doc) => snapshotFromDoc(doc));
        return text({
          id: row.id,
          name: row.name,
          projectId: row.projectId,
          parentDiagramId: row.parentDiagramId,
          snapshot,
        });
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "update_diagram",
    {
      description: "Create, update, or delete nodes and edges on a diagram. Omitted fields on an existing id are kept. See the server instructions for type ids.",
      inputSchema: z.object({
        diagramId: z.string(),
        upsertNodes: z.array(nodeInput).optional(),
        deleteNodeIds: z.array(z.string()).optional(),
        upsertEdges: z.array(edgeInput).optional(),
        deleteEdgeIds: z.array(z.string()).optional(),
      }),
    },
    async ({ diagramId, upsertNodes, deleteNodeIds, upsertEdges, deleteEdgeIds }) => {
      try {
        const [row] = await db
          .select({ projectId: diagrams.projectId, mcpEnabled: diagrams.mcpEnabled })
          .from(diagrams)
          .where(eq(diagrams.id, diagramId))
          .limit(1);
        if (!row?.mcpEnabled) return failure(new Error("diagram not found"));
        const role = await projectRole(row.projectId, userId);
        if (!canEditProject(role)) return failure(new Error("forbidden"));
        const result = await withDiagram(hocuspocus, diagramId, (doc) =>
          applyDiagramEdits(doc, {
            upsertNodes: upsertNodes as NodeInput[] | undefined,
            deleteNodeIds,
            upsertEdges: upsertEdges as EdgeInput[] | undefined,
            deleteEdgeIds,
          }),
        );
        return text(result);
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}

export function startMcp(hocuspocus: Hocuspocus) {
  const port = Number(process.env.MCP_PORT ?? 1235);
  const httpServer = createServer(async (req, res) => {
    await handleMcp(hocuspocus, req, res);
  });
  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`mcp listening on http://localhost:${port}/mcp`);
  });
}

async function handleMcp(hocuspocus: Hocuspocus, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/mcp") {
    res.writeHead(404).end();
    return;
  }
  const userId = await userIdFromHeader(req.headers.authorization);
  if (!userId) {
    res.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  const mcp = createMcp(hocuspocus, userId);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    void transport.close();
    void mcp.close();
  });
  await mcp.connect(transport);
  await transport.handleRequest(req, res);
}
