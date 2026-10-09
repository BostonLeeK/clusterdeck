import { Server } from "@hocuspocus/server";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import * as Y from "yjs";
import { getNodeMap, snapshotFromDoc, type DiagramSnapshot, type MemberRole } from "@dataflow/shared";
import { appendDiagramHistory, db, diagrams, projects } from "@dataflow/db";
import { startMcp } from "./mcp";

type AuthContext = {
  userId: string;
  role: MemberRole | "public";
  diagramId: string;
};

function keepChildLinks(document: Y.Doc, previous: DiagramSnapshot | null | undefined) {
  if (!previous) return;
  const links = new Map<string, { childDiagramId: string; childCount?: number }>();
  for (const node of previous.nodes) {
    if (node.data.kind !== "infra" || !node.data.childDiagramId) continue;
    links.set(node.id, {
      childDiagramId: node.data.childDiagramId,
      childCount: node.data.childCount,
    });
  }
  if (!links.size) return;
  const nodes = getNodeMap(document);
  document.transact(() => {
    for (const [id, link] of links) {
      const node = nodes.get(id);
      if (!node || node.data.kind !== "infra" || node.data.childDiagramId) continue;
      nodes.set(id, {
        ...node,
        data: {
          ...node.data,
          childDiagramId: link.childDiagramId,
          childCount: node.data.childCount ?? link.childCount ?? 0,
        },
      });
    }
  });
}

const secret = new TextEncoder().encode(process.env.REALTIME_SECRET ?? "dev-realtime-secret");
const port = Number(process.env.REALTIME_PORT ?? 1234);

const server = new Server({
  port,
  address: "0.0.0.0",
  debounce: 2000,
  maxDebounce: 10000,
  quiet: false,
  async onAuthenticate({ token, documentName, connectionConfig }) {
    const { payload } = await jwtVerify(token, secret);
    const diagramId = String(payload.diagramId ?? "");
    const userId = String(payload.userId ?? "");
    const role = String(payload.role ?? "viewer") as MemberRole | "public";
    if (!diagramId || diagramId !== documentName) {
      throw new Error("diagram mismatch");
    }
    if (role === "viewer" || role === "public") {
      connectionConfig.readOnly = true;
    }
    return { userId, role, diagramId } satisfies AuthContext;
  },
  async onLoadDocument({ documentName, document }) {
    const [row] = await db.select().from(diagrams).where(eq(diagrams.id, documentName)).limit(1);
    if (!row) throw new Error("diagram not found");
    if (row.ydocState && row.ydocState.length > 0) {
      Y.applyUpdate(document, row.ydocState);
    } else if (row.snapshot) {
      const { applySnapshot } = await import("@dataflow/shared");
      applySnapshot(document, row.snapshot);
    }
  },
  async onStoreDocument({ documentName, document, lastContext }) {
    const [row] = await db
      .select({ snapshot: diagrams.snapshot, projectId: diagrams.projectId })
      .from(diagrams)
      .where(eq(diagrams.id, documentName))
      .limit(1);
    if (row) keepChildLinks(document, row.snapshot);
    const update = Y.encodeStateAsUpdate(document);
    const snapshot = snapshotFromDoc(document);
    await db
      .update(diagrams)
      .set({
        ydocState: update,
        snapshot,
        updatedAt: new Date(),
      })
      .where(eq(diagrams.id, documentName));
    if (row?.projectId) {
      await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, row.projectId));
      const auth = lastContext as AuthContext | undefined;
      await appendDiagramHistory({
        diagramId: documentName,
        projectId: row.projectId,
        userId: auth?.userId,
        snapshot,
        previous: row.snapshot,
      });
    }
  },
});

await server.listen();
startMcp(server.hocuspocus);
console.log(`realtime listening on ws://localhost:${port}`);
