"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, diagrams, projectMembers, projectTags, projects, workspaceMembers, workspaces } from "@dataflow/db";
import { emptySnapshot } from "@dataflow/shared";
import { requireUser } from "@/lib/queries";

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "Untitled project").trim() || "Untitled project";
  const description = String(formData.get("description") ?? "");
  const kind = formData.get("kind") === "shared" ? "shared" : "personal";
  const workspaceId = String(formData.get("workspaceId") ?? "") || null;
  const [project] = await db
    .insert(projects)
    .values({
      name,
      description,
      kind,
      ownerId: user.id!,
      workspaceId,
    })
    .returning();
  if (!project) throw new Error("failed to create project");
  await db.insert(projectMembers).values({ projectId: project.id, userId: user.id!, role: "owner" });
  const [diagram] = await db
    .insert(diagrams)
    .values({ projectId: project.id, name, snapshot: emptySnapshot() })
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
}

export async function trashProject(projectId: string) {
  const user = await requireUser();
  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(eq(projects.id, projectId));
  void user;
  revalidatePath("/projects");
}

export async function restoreProject(projectId: string) {
  await requireUser();
  await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, projectId));
  revalidatePath("/projects");
}

export async function deleteProjectForever(projectId: string) {
  await requireUser();
  await db.delete(projects).where(eq(projects.id, projectId));
  revalidatePath("/projects");
}

export async function createWorkspace(name: string) {
  const user = await requireUser();
  const [workspace] = await db.insert(workspaces).values({ name }).returning();
  if (!workspace) throw new Error("failed");
  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id!,
    role: "owner",
  });
  revalidatePath("/projects");
  return workspace.id;
}
