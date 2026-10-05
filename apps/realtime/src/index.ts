import { Server } from "@hocuspocus/server";
import { eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import * as Y from "yjs";
import { snapshotFromDoc, type MemberRole } from "@dataflow/shared";
import { db, diagrams, projects } from "@dataflow/db";

type AuthContext = {
  userId: string;
  role: MemberRole | "public";
  diagramId: string;
};

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
  async onStoreDocument({ documentName, document }) {
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
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, (await db.select({ projectId: diagrams.projectId }).from(diagrams).where(eq(diagrams.id, documentName)).limit(1))[0]?.projectId ?? ""));
  },
});

await server.listen();
console.log(`realtime listening on ws://localhost:${port}`);
