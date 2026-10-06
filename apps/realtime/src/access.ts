import { and, eq } from "drizzle-orm";
import { db, projectMembers, projects, workspaceMembers } from "@dataflow/db";
import { canEdit, type MemberRole } from "@dataflow/shared";

export async function projectRole(projectId: string, userId: string): Promise<MemberRole | null> {
  const [project] = await db
    .select({ ownerId: projects.ownerId, workspaceId: projects.workspaceId, deletedAt: projects.deletedAt })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project || project.deletedAt) return null;
  if (project.ownerId === userId) return "owner";
  const [member] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);
  if (member) return member.role;
  if (!project.workspaceId) return null;
  const [workspaceMember] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, project.workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return workspaceMember ? "editor" : null;
}

export function canEditProject(role: MemberRole | null) {
  return canEdit(role);
}
