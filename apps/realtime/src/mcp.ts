import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Hocuspocus } from "@hocuspocus/server";
import { and, desc, eq, exists, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, diagrams, projectMembers, projects, users, workspaceMembers } from "@dataflow/db";
import { EDGE_DIRECTIONS, EDGE_LINE_SHAPES, diagramAgentInstructions, snapshotFromDoc } from "@dataflow/shared";
import { canEditProject, projectRole } from "./access";
import { applyDiagramEdits, type EdgeInput, type NodeInput } from "./mcp-edit";

const propertyInput = z.object({
  id: z.string().optional().describe("Stable property id. Omit to create a new one."),
  key: z.string().describe('Label, e.g. "OS", "IP", "Port", "Hostname".'),
  value: z.string().describe('Value, e.g. "Windows", "Linux", "10.10.52.69".'),
  icon: z.string().optional().describe('Optional Iconify id, e.g. "mdi:linux", "mdi:microsoft-windows".'),
  showOnCanvas: z
    .boolean()
    .optional()
    .describe("Show this row on the canvas card. Defaults to true."),
});

const connectorInput = z.object({
  nodeId: z.string().describe("Id of a node inside the child diagram to publish on this parent."),
  title: z.string().describe("Handle label on the parent (usually the inner node title)."),
  direction: z.enum(["in", "out"]).describe("in = target side, out = source side."),
});

const nodeInput = z.object({
  id: z.string().optional().describe("Existing id to update, or omit to create."),
  kind: z.enum(["infra", "group", "note", "port"]).optional().describe("Required conceptually for creates; defaults to infra."),
  position: z.object({ x: z.number(), y: z.number() }).optional().describe("Required for new nodes."),
  parentId: z.string().nullable().optional().describe("Group id, or null to detach from a group."),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  typeId: z.string().optional().describe("Infra catalog id (service, app, postgres, …). Required for new infra."),
  subtitle: z.string().optional(),
  description: z.string().optional().describe("Markdown description."),
  displayDescription: z.string().optional().describe("Short caption on the canvas."),
  tags: z.array(z.string()).optional().describe("Replaces the full tag list when sent."),
  status: z.enum(["healthy", "degraded", "unknown", "offline"]).optional(),
  shape: z.enum(["rounded", "rectangle", "cylinder", "hexagon", "actor", "stadium"]).optional(),
  scope: z.enum(["internal", "external"]).optional(),
  lifecycle: z.enum(["live", "future", "deprecated", "removed"]).optional(),
  technologies: z.array(z.string()).optional().describe("Tech catalog ids. Replaces the full list when sent."),
  accentColor: z
    .string()
    .nullable()
    .optional()
    .describe("Hex from accent swatches, or null to reset."),
  properties: z
    .array(propertyInput)
    .optional()
    .describe("Canvas/inspector key-value facts. Replaces the full list when sent. Use [] to clear."),
  connectors: z
    .array(connectorInput)
    .optional()
    .describe(
      "Publish inner child-diagram nodes as extra in/out handles on this parent. Replaces the full list when sent. Use [] to clear.",
    ),
  body: z.string().optional().describe("Note body."),
  tone: z.enum(["text", "comment"]).optional(),
  direction: z.enum(["in", "out"]).optional().describe("Port direction."),
  protocol: z.string().optional().describe("Port protocol label."),
  parentNodeId: z.string().optional().describe("Port parent node id."),
  parentEdgeId: z.string().optional().describe("Port parent edge id."),
});

const edgeInput = z.object({
  id: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  sourceHandle: z
    .string()
    .nullable()
    .optional()
    .describe('Default handle if omitted/null. Published connector: "out:<innerNodeId>".'),
  targetHandle: z
    .string()
    .nullable()
    .optional()
    .describe('Default handle if omitted/null. Published connector: "in:<innerNodeId>".'),
  label: z.string().optional(),
  reverseLabel: z.string().optional().describe("Label for reverse traffic when direction is both."),
  animated: z.boolean().optional(),
  lineShape: z.enum(EDGE_LINE_SHAPES).optional(),
  direction: z.enum(EDGE_DIRECTIONS).optional().describe("forward | backward | both."),
});

const tagDefInput = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

const flowInput = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  edgeIds: z.array(z.string()),
});

const metaInput = z.object({
  tagDefs: z.array(tagDefInput).optional().describe("Replaces diagram tag definitions when sent."),
  flows: z.array(flowInput).optional().describe("Replaces named flows when sent."),
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
      description:
        "List diagrams this token may open (root and inner). Access is off until the project enables MCP. Use returned id with get_diagram / update_diagram. Optional query filters by diagram or project name.",
      inputSchema: z.object({
        query: z.string().optional().describe("Case-insensitive filter on diagram or project name."),
      }),
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
        .where(and(visibleProjects(userId), eq(projects.mcpEnabled, true)))
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
      description:
        "Read one diagram snapshot: nodes (including properties, connectors, accentColor), edges (including handles and direction), and meta (tagDefs, flows). Always call before update_diagram when editing existing content.",
      inputSchema: z.object({
        diagramId: z.string().describe("Diagram id from list_diagrams."),
      }),
    },
    async ({ diagramId }) => {
      try {
        const [row] = await db
          .select({
            id: diagrams.id,
            name: diagrams.name,
            projectId: diagrams.projectId,
            parentDiagramId: diagrams.parentDiagramId,
            mcpEnabled: projects.mcpEnabled,
          })
          .from(diagrams)
          .innerJoin(projects, eq(diagrams.projectId, projects.id))
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
      description: [
        "Create, update, or delete nodes and edges; optionally replace meta.tagDefs / meta.flows.",
        "Omitted scalar fields on an existing id are kept. Arrays you send (tags, technologies, properties, connectors, tagDefs, flows) replace the previous value — use [] to clear.",
        "properties: canvas facts like OS/IP ({ key, value, icon?, showOnCanvas? }).",
        "connectors: publish inner-diagram nodes as parent in/out handles ({ nodeId, title, direction }). Edge handles become in:<nodeId> / out:<nodeId>.",
        "See server instructions for full field docs, catalogs, and examples.",
      ].join(" "),
      inputSchema: z.object({
        diagramId: z.string(),
        upsertNodes: z.array(nodeInput).optional(),
        deleteNodeIds: z.array(z.string()).optional(),
        upsertEdges: z.array(edgeInput).optional(),
        deleteEdgeIds: z.array(z.string()).optional(),
        meta: metaInput.optional(),
      }),
    },
    async ({ diagramId, upsertNodes, deleteNodeIds, upsertEdges, deleteEdgeIds, meta }) => {
      try {
        const [row] = await db
          .select({ projectId: diagrams.projectId, mcpEnabled: projects.mcpEnabled })
          .from(diagrams)
          .innerJoin(projects, eq(diagrams.projectId, projects.id))
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
            meta,
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
