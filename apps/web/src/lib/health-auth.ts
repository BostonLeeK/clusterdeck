import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, diagrams, projects, users } from "@dataflow/db";
import { canEdit } from "@dataflow/shared";
import { getAccess } from "@/lib/queries";

export async function userIdFromMcpBearer(authorization: string | null) {
  const token = authorization?.match(/^Bearer\s+(\S+)$/)?.[1];
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.mcpTokenHash, hash)).limit(1);
  return user?.id ?? null;
}

export async function resolveDiagramForHealthIngest(diagramId: string, userId: string) {
  const [row] = await db
    .select({
      diagramId: diagrams.id,
      projectId: diagrams.projectId,
      mcpEnabled: projects.mcpEnabled,
    })
    .from(diagrams)
    .innerJoin(projects, eq(diagrams.projectId, projects.id))
    .where(eq(diagrams.id, diagramId))
    .limit(1);
  if (!row?.mcpEnabled) return null;
  const access = await getAccess(row.projectId, userId);
  if (!access || !canEdit(access.role)) return null;
  return row;
}

export async function resolveDiagramForHealthRead(diagramId: string, userId: string | undefined) {
  const [row] = await db
    .select({
      diagramId: diagrams.id,
      projectId: diagrams.projectId,
    })
    .from(diagrams)
    .where(eq(diagrams.id, diagramId))
    .limit(1);
  if (!row) return null;
  const access = await getAccess(row.projectId, userId);
  if (!access) return null;
  return row;
}
