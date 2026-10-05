import { and, eq } from "drizzle-orm";
import { db, projectInvites, projectMembers, projects } from "@dataflow/db";

export async function acceptPendingInvites(email: string, userId: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !userId) return;

  const invites = await db.select().from(projectInvites).where(eq(projectInvites.email, normalized));
  for (const invite of invites) {
    await ensureProjectMember(invite.projectId, userId, invite.role);
  }
}

export async function acceptInviteByToken(token: string, userId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const [invite] = await db.select().from(projectInvites).where(eq(projectInvites.token, token)).limit(1);
  if (!invite) return { missing: true as const };
  if (invite.email !== normalized) return { error: "mismatch" as const, invite };

  await ensureProjectMember(invite.projectId, userId, invite.role);
  await db.delete(projectInvites).where(eq(projectInvites.id, invite.id));
  return { ok: true as const, projectId: invite.projectId };
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
