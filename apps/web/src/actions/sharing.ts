"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, projectInvites, projectMembers, projects, users } from "@dataflow/db";
import { canShare, type MemberRole } from "@dataflow/shared";
import { appBaseUrl, emailConfigured, sendEmail } from "@/lib/email";
import { projectInviteEmailHtml } from "@/lib/email-templates";
import { getAccess, requireUser } from "@/lib/queries";

export async function inviteMember(projectId: string, email: string, role: MemberRole) {
  const user = await requireUser();
  const access = await getAccess(projectId, user.id);
  if (!access || !canShare(access.role)) return { error: "You don’t have permission to share this project." };

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return { error: "Enter a valid email address." };

  if (!emailConfigured()) {
    return { error: "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM." };
  }

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
  }

  const [existingInvite] = await db
    .select()
    .from(projectInvites)
    .where(and(eq(projectInvites.projectId, projectId), eq(projectInvites.email, normalized)))
    .limit(1);

  let inviteToken: string;
  if (existingInvite) {
    await db.update(projectInvites).set({ role }).where(eq(projectInvites.id, existingInvite.id));
    inviteToken = existingInvite.token;
  } else {
    const [created] = await db
      .insert(projectInvites)
      .values({ projectId, email: normalized, role })
      .returning();
    if (!created) return { error: "Couldn’t create invite." };
    inviteToken = created.token;
  }

  await db.update(projects).set({ kind: "shared", updatedAt: new Date() }).where(eq(projects.id, projectId));

  const actionUrl = `${appBaseUrl()}/invite/${inviteToken}`;

  try {
    await sendEmail({
      to: normalized,
      subject: `${user.name ?? "Someone"} invited you to ${access.project.name}`,
      html: projectInviteEmailHtml({
        inviterName: user.name ?? user.email ?? "A teammate",
        projectName: access.project.name,
        role,
        actionUrl,
        existingUser: Boolean(existingUser),
      }),
    });
  } catch {
    return { error: "Invite saved, but the email could not be sent. Check RESEND_API_KEY." };
  }

  revalidatePath(`/editor/${projectId}`);
  return { ok: true as const };
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
