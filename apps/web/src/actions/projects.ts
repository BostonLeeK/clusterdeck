"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { and, eq, isNull } from "drizzle-orm";
import {
  db,
  diagrams,
  projectMembers,
  projectTags,
  projectTemplates,
  projects,
  workspaceMembers,
  workspaces,
} from "@dataflow/db";
import { canEdit, emptySnapshot, templateById, type DiagramBundle, type MemberRole } from "@dataflow/shared";
import { buildDiagramBundle, createProjectFromBundle } from "@/lib/diagram-tree";
import { getAccess, requireUser } from "@/lib/queries";

export async function createProject(formData: FormData) {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "Untitled project").trim() || "Untitled project";
    const description = String(formData.get("description") ?? "");
    const kind = formData.get("kind") === "shared" ? "shared" : "personal";
    const workspaceId = String(formData.get("workspaceId") ?? "") || null;
    const templateKey = String(formData.get("template") ?? "");
    const tags = String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (workspaceId) {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .limit(1);
      if (!membership) return { error: "You are not a member of that team." };
    }

    let bundle: DiagramBundle | null = null;
    if (templateKey.startsWith("user:")) {
      const templateId = templateKey.slice("user:".length);
      const [row] = await db
        .select()
        .from(projectTemplates)
        .where(eq(projectTemplates.id, templateId))
        .limit(1);
      if (!row) return { error: "Template not found." };
      const canUse =
        row.ownerId === user.id ||
        (row.workspaceId &&
          (
            await db
              .select()
              .from(workspaceMembers)
              .where(
                and(eq(workspaceMembers.workspaceId, row.workspaceId), eq(workspaceMembers.userId, user.id)),
              )
              .limit(1)
          )[0]);
      if (!canUse) return { error: "You can’t use this template." };
      bundle = {
        ...row.bundle,
        name,
        snapshot: structuredClone(row.bundle.snapshot),
        children: structuredClone(row.bundle.children),
      };
    } else {
      const template = templateById(templateKey);
      const snapshot = template ? structuredClone(template.snapshot) : emptySnapshot();
      bundle = { version: 1, name, snapshot, children: [] };
    }

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
    const { diagramId } = await createProjectFromBundle(project.id, bundle);
    if (tags.length) {
      await db.insert(projectTags).values(
        tags.map((tag) => ({ projectId: project.id, name: tag, color: "#818cf8" })),
      );
    }
    revalidatePath("/projects");
    return { projectId: project.id, diagramId };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to create project. Sign out and sign in again." };
  }
}

export async function duplicateProject(projectId: string) {
  try {
    const user = await requireUser();
    const access = await getAccess(projectId, user.id);
    if (!access) return { error: "Project not found." };

    const [source] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!source || source.deletedAt) return { error: "Project not found." };

    const [root] = await db
      .select()
      .from(diagrams)
      .where(and(eq(diagrams.projectId, projectId), isNull(diagrams.parentDiagramId)))
      .limit(1);
    if (!root) return { error: "Project has no diagram." };

    let workspaceId = source.workspaceId;
    if (workspaceId) {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
        .limit(1);
      if (!membership) workspaceId = null;
    }

    const bundle = await buildDiagramBundle(`${source.name} (copy)`, root.snapshot);
    const [project] = await db
      .insert(projects)
      .values({
        name: `${source.name} (copy)`,
        description: source.description,
        kind: workspaceId ? source.kind : "personal",
        ownerId: user.id,
        workspaceId,
      })
      .returning();
    if (!project) return { error: "Failed to duplicate project." };
    await db.insert(projectMembers).values({ projectId: project.id, userId: user.id, role: "owner" });

    const tags = await db.select().from(projectTags).where(eq(projectTags.projectId, projectId));
    if (tags.length) {
      await db.insert(projectTags).values(
        tags.map((tag) => ({ projectId: project.id, name: tag.name, color: tag.color })),
      );
    }

    const { diagramId } = await createProjectFromBundle(project.id, {
      ...bundle,
      name: project.name,
    });
    revalidatePath("/projects");
    return { projectId: project.id, diagramId };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to duplicate project." };
  }
}

export async function saveProjectAsTemplate(
  projectId: string,
  input: { name: string; description?: string; workspaceScoped?: boolean },
) {
  try {
    const user = await requireUser();
    const access = await getAccess(projectId, user.id);
    if (!access || !canEdit(access.role)) return { error: "You can’t save this project as a template." };

    const [source] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!source || source.deletedAt) return { error: "Project not found." };

    const name = input.name.trim();
    if (!name) return { error: "Name is required." };

    const [root] = await db
      .select()
      .from(diagrams)
      .where(and(eq(diagrams.projectId, projectId), isNull(diagrams.parentDiagramId)))
      .limit(1);
    if (!root) return { error: "Project has no diagram." };

    let workspaceId: string | null = null;
    if (input.workspaceScoped && source.workspaceId) {
      const [membership] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(eq(workspaceMembers.workspaceId, source.workspaceId), eq(workspaceMembers.userId, user.id)),
        )
        .limit(1);
      if (!membership) return { error: "You are not a member of that team." };
      workspaceId = source.workspaceId;
    }

    const tags = await db.select().from(projectTags).where(eq(projectTags.projectId, projectId));
    const bundle = await buildDiagramBundle(name, root.snapshot);
    const [created] = await db
      .insert(projectTemplates)
      .values({
        ownerId: user.id,
        workspaceId,
        name,
        description: (input.description ?? source.description).trim(),
        tags: tags.map((tag) => tag.name),
        bundle,
      })
      .returning({ id: projectTemplates.id });
    if (!created) return { error: "Failed to save template." };
    revalidatePath("/projects");
    return { id: created.id };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to save template." };
  }
}

export async function deleteProjectTemplate(templateId: string) {
  try {
    const user = await requireUser();
    const [row] = await db.select().from(projectTemplates).where(eq(projectTemplates.id, templateId)).limit(1);
    if (!row) return { error: "Template not found." };
    if (row.ownerId !== user.id) return { error: "Only the template owner can delete it." };
    await db.delete(projectTemplates).where(eq(projectTemplates.id, templateId));
    revalidatePath("/projects");
    return { ok: true as const };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Failed to delete template." };
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
