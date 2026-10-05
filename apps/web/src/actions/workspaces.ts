"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, users, workspaceInvites, workspaceMembers, workspaces } from "@dataflow/db";
import { canManageWorkspace } from "@dataflow/shared";
import { appBaseUrl, emailConfigured, sendEmail } from "@/lib/email";
import { workspaceInviteEmailHtml } from "@/lib/email-templates";
import { requireUser } from "@/lib/queries";

type InviteRole = "admin" | "member";

async function requireWorkspaceManager(workspaceId: string) {
  const user = await requireUser();
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  if (!membership || !canManageWorkspace(membership.role)) {
    return { error: "Only team owners and admins can manage members." as const, user, membership: null, workspace: null };
  }
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) {
    return { error: "Team not found." as const, user, membership: null, workspace: null };
  }
  return { user, membership, workspace, error: null };
}

export async function inviteWorkspaceMember(workspaceId: string, email: string, role: InviteRole = "member") {
  const gate = await requireWorkspaceManager(workspaceId);
  if (gate.error || !gate.workspace) return { error: gate.error };
  const { user, workspace } = gate;

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return { error: "Enter a valid email address." };
  if (!emailConfigured()) {
    return { error: "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM." };
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (existingUser) {
    const [member] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, existingUser.id)))
      .limit(1);
    if (member) {
      if (member.role === "owner") return { error: "This person is already the team owner." };
      await db
        .update(workspaceMembers)
        .set({ role })
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, existingUser.id)));
    } else {
      await db.insert(workspaceMembers).values({ workspaceId, userId: existingUser.id, role });
    }
    await db
      .delete(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.email, normalized)));

    try {
      await sendEmail({
        to: normalized,
        subject: `${user.name ?? "Someone"} invited you to ${workspace.name}`,
        html: workspaceInviteEmailHtml({
          inviterName: user.name ?? user.email ?? "A teammate",
          teamName: workspace.name,
          role,
          actionUrl: `${appBaseUrl()}/projects?filter=team&workspace=${workspaceId}`,
          existingUser: true,
        }),
      });
    } catch {
      return { error: "Member added, but the email could not be sent. Check RESEND_API_KEY." };
    }

    revalidatePath("/projects");
    return { ok: true as const };
  }

  const [existingInvite] = await db
    .select()
    .from(workspaceInvites)
    .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.email, normalized)))
    .limit(1);

  let inviteToken: string;
  if (existingInvite) {
    await db.update(workspaceInvites).set({ role }).where(eq(workspaceInvites.id, existingInvite.id));
    inviteToken = existingInvite.token;
  } else {
    const [created] = await db
      .insert(workspaceInvites)
      .values({ workspaceId, email: normalized, role })
      .returning();
    if (!created) return { error: "Couldn’t create invite." };
    inviteToken = created.token;
  }

  try {
    await sendEmail({
      to: normalized,
      subject: `${user.name ?? "Someone"} invited you to ${workspace.name}`,
      html: workspaceInviteEmailHtml({
        inviterName: user.name ?? user.email ?? "A teammate",
        teamName: workspace.name,
        role,
        actionUrl: `${appBaseUrl()}/invite/${inviteToken}`,
        existingUser: false,
      }),
    });
  } catch {
    return { error: "Invite saved, but the email could not be sent. Check RESEND_API_KEY." };
  }

  revalidatePath("/projects");
  return { ok: true as const };
}

export async function updateWorkspaceMemberRole(workspaceId: string, userId: string, role: InviteRole) {
  const gate = await requireWorkspaceManager(workspaceId);
  if (gate.error || !gate.membership) return { error: gate.error };

  const [target] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") return { error: "Team owner role can’t be changed." };

  await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));
  revalidatePath("/projects");
  return { ok: true as const };
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const gate = await requireWorkspaceManager(workspaceId);
  if (gate.error || !gate.user) return { error: gate.error };
  if (gate.user.id === userId) return { error: "You can’t remove yourself." };

  const [target] = await db
    .select({ role: workspaceMembers.role, email: users.email })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!target) return { error: "Member not found." };
  if (target.role === "owner") return { error: "You can’t remove the team owner." };

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)));

  if (target.email) {
    await db
      .delete(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspaceId), eq(workspaceInvites.email, target.email)));
  }

  revalidatePath("/projects");
  return { ok: true as const };
}

export async function cancelWorkspaceInvite(workspaceId: string, inviteId: string) {
  const gate = await requireWorkspaceManager(workspaceId);
  if (gate.error) return { error: gate.error };
  await db
    .delete(workspaceInvites)
    .where(and(eq(workspaceInvites.id, inviteId), eq(workspaceInvites.workspaceId, workspaceId)));
  revalidatePath("/projects");
  return { ok: true as const };
}
