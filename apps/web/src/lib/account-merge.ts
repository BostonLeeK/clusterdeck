import { and, eq } from "drizzle-orm";
import { db, accounts, projectMembers, projects, sessions, users, workspaceMembers } from "@dataflow/db";
import type { MemberRole, WorkspaceRole } from "@dataflow/shared";

function roleRank(role: MemberRole) {
  if (role === "owner") return 3;
  if (role === "editor") return 2;
  return 1;
}

function workspaceRank(role: WorkspaceRole) {
  if (role === "owner") return 3;
  if (role === "admin") return 2;
  return 1;
}

export async function mergeUsersIntoCanonical(canonicalId: string, duplicateId: string) {
  if (canonicalId === duplicateId) return;

  const owned = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, duplicateId));
  for (const project of owned) {
    await db.update(projects).set({ ownerId: canonicalId }).where(eq(projects.id, project.id));
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, canonicalId)))
      .limit(1);
    if (!member) {
      await db.insert(projectMembers).values({ projectId: project.id, userId: canonicalId, role: "owner" });
    } else if (member.role !== "owner") {
      await db
        .update(projectMembers)
        .set({ role: "owner" })
        .where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, canonicalId)));
    }
  }

  const memberships = await db.select().from(projectMembers).where(eq(projectMembers.userId, duplicateId));
  for (const membership of memberships) {
    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, membership.projectId), eq(projectMembers.userId, canonicalId)))
      .limit(1);
    if (!existing) {
      await db.insert(projectMembers).values({
        projectId: membership.projectId,
        userId: canonicalId,
        role: membership.role,
      });
    } else if (roleRank(membership.role) > roleRank(existing.role)) {
      await db
        .update(projectMembers)
        .set({ role: membership.role })
        .where(and(eq(projectMembers.projectId, membership.projectId), eq(projectMembers.userId, canonicalId)));
    }
  }
  await db.delete(projectMembers).where(eq(projectMembers.userId, duplicateId));

  const teamMemberships = await db.select().from(workspaceMembers).where(eq(workspaceMembers.userId, duplicateId));
  for (const membership of teamMemberships) {
    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, membership.workspaceId), eq(workspaceMembers.userId, canonicalId)),
      )
      .limit(1);
    if (!existing) {
      await db.insert(workspaceMembers).values({
        workspaceId: membership.workspaceId,
        userId: canonicalId,
        role: membership.role,
      });
    } else if (workspaceRank(membership.role) > workspaceRank(existing.role)) {
      await db
        .update(workspaceMembers)
        .set({ role: membership.role })
        .where(
          and(eq(workspaceMembers.workspaceId, membership.workspaceId), eq(workspaceMembers.userId, canonicalId)),
        );
    }
  }
  await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, duplicateId));

  const oauthAccounts = await db.select().from(accounts).where(eq(accounts.userId, duplicateId));
  for (const account of oauthAccounts) {
    const [clash] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.provider, account.provider),
          eq(accounts.providerAccountId, account.providerAccountId),
          eq(accounts.userId, canonicalId),
        ),
      )
      .limit(1);
    if (clash) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, account.provider),
            eq(accounts.providerAccountId, account.providerAccountId),
            eq(accounts.userId, duplicateId),
          ),
        );
      continue;
    }
    await db
      .update(accounts)
      .set({ userId: canonicalId })
      .where(and(eq(accounts.provider, account.provider), eq(accounts.providerAccountId, account.providerAccountId)));
  }

  await db.delete(sessions).where(eq(sessions.userId, duplicateId));
  await db.delete(users).where(eq(users.id, duplicateId));
}

export async function resolveCanonicalUserByEmail(
  email: string,
  incoming?: {
    id?: string | null;
    name?: string | null;
    image?: string | null;
    emailVerified?: boolean | Date | null;
  },
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const matches = await db.select().from(users).where(eq(users.email, normalized));
  if (!matches.length) return null;

  const canonical =
    matches.find((user) => user.id === incoming?.id) ??
    matches.find((user) => Boolean(user.passwordHash)) ??
    matches.find((user) => Boolean(user.emailVerified)) ??
    matches[0]!;

  for (const duplicate of matches) {
    if (duplicate.id === canonical.id) continue;
    await mergeUsersIntoCanonical(canonical.id, duplicate.id);
  }

  const patch: Partial<typeof users.$inferInsert> = {};
  if (!canonical.name && incoming?.name) patch.name = incoming.name;
  if (!canonical.image && incoming?.image) patch.image = incoming.image;
  if (!canonical.emailVerified && incoming?.emailVerified) {
    patch.emailVerified = incoming.emailVerified instanceof Date ? incoming.emailVerified : new Date();
  }
  if (Object.keys(patch).length) {
    await db.update(users).set(patch).where(eq(users.id, canonical.id));
  }

  const [fresh] = await db.select().from(users).where(eq(users.id, canonical.id)).limit(1);
  return fresh ?? canonical;
}

export async function ensureOAuthAccountLinked(opts: {
  userId: string;
  provider: string;
  providerAccountId: string;
  type?: string;
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
}) {
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.provider, opts.provider), eq(accounts.providerAccountId, opts.providerAccountId)))
    .limit(1);

  if (existing) {
    if (existing.userId !== opts.userId) {
      await mergeUsersIntoCanonical(opts.userId, existing.userId);
      await db
        .update(accounts)
        .set({ userId: opts.userId })
        .where(and(eq(accounts.provider, opts.provider), eq(accounts.providerAccountId, opts.providerAccountId)));
    }
    return;
  }

  await db.insert(accounts).values({
    userId: opts.userId,
    type: opts.type ?? "oauth",
    provider: opts.provider,
    providerAccountId: opts.providerAccountId,
    access_token: opts.access_token ?? null,
    refresh_token: opts.refresh_token ?? null,
    expires_at: opts.expires_at ?? null,
    token_type: opts.token_type ?? null,
    scope: opts.scope ?? null,
    id_token: opts.id_token ?? null,
  });
}
