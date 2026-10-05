import { and, eq } from "drizzle-orm";
import { db, projectInvites, projectMembers, projects } from "@dataflow/db";

export async function acceptPendingInvites(email: string, userId: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !userId) return;

  const invites = await db.select().from(projectInvites).where(eq(projectInvites.email, normalized));
  if (!invites.length) return;

  for (const invite of invites) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, invite.projectId), eq(projectMembers.userId, userId)))
      .limit(1);

    if (member) {
      await db
        .update(projectMembers)
        .set({ role: invite.role })
        .where(and(eq(projectMembers.projectId, invite.projectId), eq(projectMembers.userId, userId)));
    } else {
      await db.insert(projectMembers).values({
        projectId: invite.projectId,
        userId,
        role: invite.role,
      });
    }

    await db.update(projects).set({ kind: "shared", updatedAt: new Date() }).where(eq(projects.id, invite.projectId));
    await db.delete(projectInvites).where(eq(projectInvites.id, invite.id));
  }
}
