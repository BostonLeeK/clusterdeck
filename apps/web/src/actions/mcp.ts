"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { db, diagrams, projectMembers, projects, users, workspaceMembers } from "@dataflow/db";
import { canEdit } from "@dataflow/shared";
import { getAccess, requireUser } from "@/lib/queries";

async function mcpEndpoint() {
  const configured = process.env.MCP_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    const app = (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
    return `${app}/mcp`;
  }
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = headerStore.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${proto}://${host}/mcp`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function mcpTokenStatus() {
  const user = await requireUser();
  const [row] = await db
    .select({ createdAt: users.mcpTokenCreatedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return {
    createdAt: row?.createdAt?.toISOString() ?? null,
    endpoint: await mcpEndpoint(),
  };
}

export async function generateMcpToken() {
  const user = await requireUser();
  const token = `cd_${randomBytes(32).toString("base64url")}`;
  await db
    .update(users)
    .set({ mcpTokenHash: hashToken(token), mcpTokenCreatedAt: new Date() })
    .where(eq(users.id, user.id));
  return { token, endpoint: await mcpEndpoint() };
}

export async function revokeMcpToken() {
  const user = await requireUser();
  await db
    .update(users)
    .set({ mcpTokenHash: null, mcpTokenCreatedAt: null })
    .where(eq(users.id, user.id));
  return { ok: true as const };
}

export type McpDiagramAccess = {
  id: string;
  projectId: string;
  projectName: string;
  label: string;
  mcpEnabled: boolean;
};

export async function listMcpDiagramAccess(): Promise<McpDiagramAccess[]> {
  const user = await requireUser();
  const rows = await db
    .select({
      id: diagrams.id,
      name: diagrams.name,
      projectId: projects.id,
      projectName: projects.name,
      parentDiagramId: diagrams.parentDiagramId,
      mcpEnabled: diagrams.mcpEnabled,
      ownerId: projects.ownerId,
      workspaceId: projects.workspaceId,
      memberRole: projectMembers.role,
    })
    .from(diagrams)
    .innerJoin(projects, eq(diagrams.projectId, projects.id))
    .leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id)))
    .where(isNull(projects.deletedAt));
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id));
  const workspaces = new Set(memberships.map((item) => item.workspaceId));
  const editable = rows.filter((row) => {
    if (row.ownerId === user.id) return true;
    if (row.memberRole === "owner" || row.memberRole === "editor") return true;
    if (row.memberRole === "viewer") return false;
    return row.workspaceId ? workspaces.has(row.workspaceId) : false;
  });
  const names = new Map(editable.map((row) => [row.id, row.name]));
  return editable
    .map((row) => {
      const parent = row.parentDiagramId ? names.get(row.parentDiagramId) : undefined;
      return {
        id: row.id,
        projectId: row.projectId,
        projectName: row.projectName,
        label: parent ? `${parent} / ${row.name}` : row.name,
        mcpEnabled: row.mcpEnabled,
      };
    })
    .sort((left, right) => {
      const project = left.projectName.localeCompare(right.projectName);
      if (project !== 0) return project;
      return left.label.localeCompare(right.label);
    });
}

export async function setDiagramMcpEnabled(diagramId: string, enabled: boolean) {
  const user = await requireUser();
  const [diagram] = await db
    .select({ projectId: diagrams.projectId })
    .from(diagrams)
    .where(eq(diagrams.id, diagramId))
    .limit(1);
  if (!diagram) throw new Error("not found");
  const access = await getAccess(diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");
  await db.update(diagrams).set({ mcpEnabled: enabled }).where(eq(diagrams.id, diagramId));
  return { ok: true as const };
}
