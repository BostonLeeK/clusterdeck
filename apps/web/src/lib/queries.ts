import { and, desc, eq, exists, ilike, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import {
  db,
  diagrams,
  projectInvites,
  projectMembers,
  projectTags,
  projects,
  users,
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from "@dataflow/db";
import type { MemberRole } from "@dataflow/shared";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) redirect("/sign-in");

  if (session.user?.id) {
    const [byId] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (byId) return byId;
  }

  const email = session.user?.email?.trim().toLowerCase();
  if (email) {
    const [byEmail] = await db
      .select({ id: users.id, name: users.name, email: users.email, image: users.image })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail) return byEmail;
  }

  redirect("/sign-in");
}

export async function getAccess(projectId: string, userId?: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;
  if (!userId) {
    if (project.linkAccess === "view") return { project, role: "viewer" as MemberRole };
    return null;
  }
  if (project.ownerId === userId) return { project, role: "owner" as MemberRole };
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  if (member) return { project, role: member.role };
  if (project.workspaceId) {
    const [wsMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, userId)))
      .limit(1);
    if (wsMember) {
      return { project, role: "editor" as MemberRole };
    }
  }
  return null;
}

export async function listWorkspaces(userId: string) {
  return db
    .select({ id: workspaces.id, name: workspaces.name, role: workspaceMembers.role })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId));
}

export async function listWorkspaceMembers(workspaceId: string, userId: string) {
  const [access] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (!access) return null;
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const invites = await db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(eq(workspaceInvites.workspaceId, workspaceId));
  return { role: access.role, members, invites };
}

export async function listProjects(opts: {
  userId: string;
  filter: "all" | "personal" | "shared" | "team" | "trash";
  query?: string;
  sort?: "updated" | "name";
  workspaceId?: string;
}) {
  const memberExists = exists(
    db
      .select({ one: sql`1` })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, opts.userId))),
  );
  const workspaceMemberExists = exists(
    db
      .select({ one: sql`1` })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, projects.workspaceId),
          eq(workspaceMembers.userId, opts.userId),
        ),
      ),
  );
  const conditions = [
    or(eq(projects.ownerId, opts.userId), memberExists, and(isNotNull(projects.workspaceId), workspaceMemberExists)),
  ];
  if (opts.filter === "trash") conditions.push(isNotNull(projects.deletedAt));
  else conditions.push(isNull(projects.deletedAt));
  if (opts.filter === "personal") {
    conditions.push(eq(projects.ownerId, opts.userId));
    conditions.push(eq(projects.kind, "personal"));
  }
  if (opts.filter === "shared") {
    conditions.push(ne(projects.ownerId, opts.userId));
  }
  if (opts.filter === "team" || opts.workspaceId) {
    conditions.push(opts.workspaceId ? eq(projects.workspaceId, opts.workspaceId) : isNotNull(projects.workspaceId));
  }
  if (opts.query) {
    conditions.push(
      or(ilike(projects.name, `%${opts.query}%`), ilike(projects.description, `%${opts.query}%`)),
    );
  }

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      kind: projects.kind,
      updatedAt: projects.updatedAt,
      deletedAt: projects.deletedAt,
      ownerId: projects.ownerId,
    })
    .from(projects)
    .where(and(...conditions))
    .orderBy(opts.sort === "name" ? projects.name : desc(projects.updatedAt));

  const result = [];
  for (const row of rows) {
    const tags = await db.select().from(projectTags).where(eq(projectTags.projectId, row.id));
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: projectMembers.role,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, row.id));
    const [root] = await db
      .select()
      .from(diagrams)
      .where(and(eq(diagrams.projectId, row.id), isNull(diagrams.parentDiagramId)))
      .limit(1);
    result.push({ ...row, tags, members, rootDiagramId: root?.id, snapshot: root?.snapshot ?? { nodes: [], edges: [] } });
  }
  return result;
}

export async function getProjectBundle(projectId: string, userId?: string) {
  const access = await getAccess(projectId, userId);
  if (!access) return null;
  const tags = await db.select().from(projectTags).where(eq(projectTags.projectId, projectId));
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, projectId));
  const invites = await db.select().from(projectInvites).where(eq(projectInvites.projectId, projectId));
  const diagramRows = await db.select().from(diagrams).where(eq(diagrams.projectId, projectId));
  return { ...access, tags, members, invites, diagrams: diagramRows };
}

export async function getDiagramWithTrail(diagramId: string) {
  const [diagram] = await db.select().from(diagrams).where(eq(diagrams.id, diagramId)).limit(1);
  if (!diagram) return null;
  const trail = [];
  let current = diagram;
  while (current) {
    trail.unshift({ id: current.id, name: current.name, parentNodeId: current.parentNodeId });
    if (!current.parentDiagramId) break;
    const [parent] = await db
      .select()
      .from(diagrams)
      .where(eq(diagrams.id, current.parentDiagramId))
      .limit(1);
    if (!parent) break;
    current = parent;
  }
  return { diagram, trail };
}

export async function getPublicProject(shareToken: string) {
  const [project] = await db.select().from(projects).where(eq(projects.shareToken, shareToken)).limit(1);
  if (!project || project.linkAccess !== "view" || project.deletedAt) return null;
  const [root] = await db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.projectId, project.id), isNull(diagrams.parentDiagramId)))
    .limit(1);
  return { project, root };
}
