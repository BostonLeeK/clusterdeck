import { and, eq } from "drizzle-orm";
import {
  db,
  projectInvites,
  projectMembers,
  projects,
  workspaceInvites,
  workspaceMembers,
} from "@dataflow/db";

export async function acceptPendingInvites(email: string, userId: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !userId) return;

  const projectInviteRows = await db.select().from(projectInvites).where(eq(projectInvites.email, normalized));
  for (const invite of projectInviteRows) {
    await ensureProjectMember(invite.projectId, userId, invite.role);
  }

  const workspaceInviteRows = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.email, normalized));
  for (const invite of workspaceInviteRows) {
    await ensureWorkspaceMember(invite.workspaceId, userId, invite.role);
  }
}

export async function acceptInviteByToken(token: string, userId: string, email: string) {
  const normalized = email.trim().toLowerCase();

  const [projectInvite] = await db.select().from(projectInvites).where(eq(projectInvites.token, token)).limit(1);
  if (projectInvite) {
    if (projectInvite.email !== normalized) return { error: "mismatch" as const, invite: projectInvite };
    await ensureProjectMember(projectInvite.projectId, userId, projectInvite.role);
    await db.delete(projectInvites).where(eq(projectInvites.id, projectInvite.id));
    return { ok: true as const, kind: "project" as const, projectId: projectInvite.projectId };
  }

  const [workspaceInvite] = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.token, token))
    .limit(1);
  if (workspaceInvite) {
    if (workspaceInvite.email !== normalized) return { error: "mismatch" as const, invite: workspaceInvite };
    await ensureWorkspaceMember(workspaceInvite.workspaceId, userId, workspaceInvite.role);
    await db.delete(workspaceInvites).where(eq(workspaceInvites.id, workspaceInvite.id));
    return { ok: true as const, kind: "workspace" as const, workspaceId: workspaceInvite.workspaceId };
  }

  return { missing: true as const };
}

export async function ensureProjectMember(
  projectId: string,
  userId: string,
  role: "owner" | "editor" | "viewer",
) {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (member) {
    if (member.role !== role) {
      await db
        .update(projectMembers)
        .set({ role })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
    }
  } else {
    await db.insert(projectMembers).values({ projectId, userId, role });
  }

  await db.update(projects).set({ kind: "shared", updatedAt: new Date() }).where(eq(projects.id, projectId));
}

export async function ensureWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: "admin" | "member",
) {
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);

  if (member) {
    if (member.role === "owner") return;
    if (member.role !== role) {
      await db
        .update(workspaceMembers)
        .set({ role })
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
    }
    return;
  }

  await db.insert(workspaceMembers).values({ workspaceId, userId, role });
}
