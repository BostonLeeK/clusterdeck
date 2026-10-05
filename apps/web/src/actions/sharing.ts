"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, projectInvites, projectMembers, projects, users } from "@dataflow/db";
import { canShare, type MemberRole } from "@dataflow/shared";
import { getAccess, requireUser } from "@/lib/queries";

export async function inviteMember(projectId: string, email: string, role: MemberRole) {
  const user = await requireUser();
  const access = await getAccess(projectId, user.id);
  if (!access || !canShare(access.role)) throw new Error("forbidden");
  const normalized = email.trim().toLowerCase();
  const [existingUser] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existingUser) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, existingUser.id)))
      .limit(1);
    if (member) {
      await db
        .update(projectMembers)
        .set({ role })
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, existingUser.id)));
    } else {
      await db.insert(projectMembers).values({ projectId, userId: existingUser.id, role });
    }
  } else {
    await db.insert(projectInvites).values({ projectId, email: normalized, role });
  }
  await db.update(projects).set({ kind: "shared", updatedAt: new Date() }).where(eq(projects.id, projectId));
  revalidatePath(`/editor/${projectId}`);
}

export async function updateMemberRole(projectId: string, userId: string, role: MemberRole) {
  const user = await requireUser();
  const access = await getAccess(projectId, user.id);
  if (!access || !canShare(access.role)) throw new Error("forbidden");
  await db
    .update(projectMembers)
    .set({ role })
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  revalidatePath(`/editor/${projectId}`);
}

export async function setLinkAccess(projectId: string, enabled: boolean) {
  const user = await requireUser();
  const access = await getAccess(projectId, user.id);
  if (!access || !canShare(access.role)) throw new Error("forbidden");
  await db
    .update(projects)
    .set({ linkAccess: enabled ? "view" : "none", kind: "shared" })
    .where(eq(projects.id, projectId));
  revalidatePath(`/editor/${projectId}`);
}
