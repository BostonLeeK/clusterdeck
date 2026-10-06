"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { and, eq, isNull } from "drizzle-orm";
import { db, diagrams, projectMembers, projectTags, projects, workspaceMembers, workspaces } from "@dataflow/db";
import { canEdit, emptySnapshot, templateById, type MemberRole } from "@dataflow/shared";
import { getAccess, requireUser } from "@/lib/queries";

export async function createProject(formData: FormData) {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "Untitled project").trim() || "Untitled project";
    const description = String(formData.get("description") ?? "");
    const kind = formData.get("kind") === "shared" ? "shared" : "personal";
    const workspaceId = String(formData.get("workspaceId") ?? "") || null;
    const template = templateById(String(formData.get("template") ?? ""));
    const snapshot = template
      ? structuredClone(template.snapshot)
      : emptySnapshot();
    const [project] = await db
      .insert(projects)
      .values({
        name,
        description,
        kind,
        ownerId: user.id,
        workspaceId,
      })
      .returning();
    if (!project) return { error: "Failed to create project." };
    await db.insert(projectMembers).values({ projectId: project.id, userId: user.id, role: "owner" });
    const [diagram] = await db
      .insert(diagrams)
      .values({ projectId: project.id, name, snapshot })
      .returning();
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length) {
      await db.insert(projectTags).values(
        tags.map((tag) => ({ projectId: project.id, name: tag, color: "#818cf8" })),
      );
    }
    revalidatePath("/projects");
    return { projectId: project.id, diagramId: diagram?.id };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to create project. Sign out and sign in again." };
  }
}

async function requireProjectRole(projectId: string, allowed: (role: MemberRole) => boolean) {
  const user = await requireUser();
  const access = await getAccess(projectId, user.id);
  if (!access || !allowed(access.role)) throw new Error("forbidden");
  return access;
}

export async function updateProject(projectId: string, input: { name: string; description: string }) {
  try {
    await requireProjectRole(projectId, canEdit);
    const name = input.name.trim();
    if (!name) return { error: "Name is required." };
    const description = input.description.trim();
    await db.update(projects).set({ name, description, updatedAt: new Date() }).where(eq(projects.id, projectId));
    await db
      .update(diagrams)
      .set({ name })
      .where(and(eq(diagrams.projectId, projectId), isNull(diagrams.parentDiagramId)));
    revalidatePath("/projects");
    revalidatePath(`/editor/${projectId}`, "layout");
    return { ok: true };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "You can't edit this project." };
  }
}

export async function trashProject(projectId: string) {
  await requireProjectRole(projectId, canEdit);
  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, projectId));
  revalidatePath("/projects");
}

export async function restoreProject(projectId: string) {
  await requireProjectRole(projectId, canEdit);
  await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, projectId));
  revalidatePath("/projects");
}

export async function deleteProjectForever(projectId: string) {
  await requireProjectRole(projectId, (role) => role === "owner");
  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/projects");
}

export async function createWorkspace(name: string) {
  try {
    const user = await requireUser();
    const trimmed = name.trim();
    if (!trimmed) return { error: "Name is required." };
    const [workspace] = await db.insert(workspaces).values({ name: trimmed }).returning();
    if (!workspace) return { error: "Failed to create team." };
    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });
    revalidatePath("/projects");
    return { id: workspace.id };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to create team." };
  }
}
