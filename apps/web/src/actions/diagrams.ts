"use server";

import { SignJWT } from "jose";
import { and, eq } from "drizzle-orm";
import { db, diagrams } from "@dataflow/db";
import { canEdit, emptySnapshot, type DiagramSnapshot, type InfraNodeData, type MemberRole } from "@dataflow/shared";
import { auth } from "@/lib/auth";
import { getAccess, getDiagramWithTrail, getPublicProject, requireUser } from "@/lib/queries";

const secret = new TextEncoder().encode(process.env.REALTIME_SECRET ?? "dev-realtime-secret");

export async function issueRealtimeToken(diagramId: string, shareToken?: string) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await requireUser();
    const bundle = await getDiagramWithTrail(diagramId);
    if (!bundle) throw new Error("not found");
    const access = await getAccess(bundle.diagram.projectId, user.id);
    if (!access) throw new Error("forbidden");
    const token = await new SignJWT({
      userId: user.id,
      diagramId,
      role: access.role,
      name: user.name,
      email: user.email,
      image: user.image,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("12h")
      .sign(secret);
    return { token, role: access.role as MemberRole | "public", readOnly: !canEdit(access.role) };
  }

  if (!shareToken) throw new Error("forbidden");
  const data = await getPublicProject(shareToken);
  if (!data?.root) throw new Error("forbidden");
  const [diagram] = await db
    .select({ id: diagrams.id, projectId: diagrams.projectId })
    .from(diagrams)
    .where(and(eq(diagrams.id, diagramId), eq(diagrams.projectId, data.project.id)))
    .limit(1);
  if (!diagram) throw new Error("forbidden");
  if (data.project.linkAccess !== "view") throw new Error("forbidden");

  const token = await new SignJWT({
    userId: "guest",
    diagramId,
    role: "public",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(secret);
  return { token, role: "public" as const, readOnly: true };
}

export async function saveDiagramSnapshot(diagramId: string, snapshot: DiagramSnapshot) {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");
  await db
    .update(diagrams)
    .set({ snapshot, updatedAt: new Date() })
    .where(eq(diagrams.id, diagramId));
}

function innerContentCount(snapshot: DiagramSnapshot) {
  return snapshot.nodes.filter((node) => node.type !== "port").length;
}

function pickInnerDiagram<T extends { snapshot: DiagramSnapshot; createdAt: Date }>(rows: T[]) {
  return rows.slice().sort((left, right) => {
    const byContent = innerContentCount(right.snapshot) - innerContentCount(left.snapshot);
    if (byContent !== 0) return byContent;
    return left.createdAt.getTime() - right.createdAt.getTime();
  })[0];
}

async function linkInnerDiagram(
  diagramId: string,
  snapshot: DiagramSnapshot,
  nodeId: string,
  childDiagramId: string,
  childCount: number,
) {
  const nextSnapshot: DiagramSnapshot = {
    ...snapshot,
    nodes: snapshot.nodes.map((item) =>
      item.id === nodeId && item.data.kind === "infra"
        ? { ...item, data: { ...item.data, childDiagramId, childCount } }
        : item,
    ),
  };
  await db.update(diagrams).set({ snapshot: nextSnapshot }).where(eq(diagrams.id, diagramId));
}

export async function openOrCreateInnerDiagram(diagramId: string, nodeId: string) {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access) throw new Error("forbidden");
  const node = bundle.diagram.snapshot.nodes.find((item) => item.id === nodeId);
  if (!node || node.data.kind !== "infra") throw new Error("invalid node");
  const data = node.data as InfraNodeData;

  const children = await db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.parentDiagramId, diagramId), eq(diagrams.parentNodeId, nodeId)));
  const chosen = pickInnerDiagram(children);
  if (chosen) {
    const nodeCount = innerContentCount(chosen.snapshot);
    if (data.childDiagramId !== chosen.id) {
      await linkInnerDiagram(diagramId, bundle.diagram.snapshot, nodeId, chosen.id, nodeCount);
    }
    return { diagramId: chosen.id, nodeCount };
  }

  const [created] = await db
    .insert(diagrams)
    .values({
      projectId: bundle.diagram.projectId,
      parentDiagramId: diagramId,
      parentNodeId: nodeId,
      name: data.title,
      snapshot: emptySnapshot(),
    })
    .returning();
  if (!created) throw new Error("failed");
  await linkInnerDiagram(diagramId, bundle.diagram.snapshot, nodeId, created.id, 0);
  return { diagramId: created.id, nodeCount: 0 };
}

type DiagramRow = typeof diagrams.$inferSelect;
type InnerDiagramLink = { diagramId: string; nodeCount: number };

const MAX_CLONE_DEPTH = 12;

async function cloneDiagramTree(
  source: Pick<DiagramRow, "id" | "name" | "snapshot">,
  target: { projectId: string; parentDiagramId: string; parentNodeId: string },
  depth = 0,
): Promise<InnerDiagramLink> {
  const children = depth < MAX_CLONE_DEPTH
    ? await db.select().from(diagrams).where(eq(diagrams.parentDiagramId, source.id))
    : [];
  const [created] = await db
    .insert(diagrams)
    .values({
      projectId: target.projectId,
      parentDiagramId: target.parentDiagramId,
      parentNodeId: target.parentNodeId,
      name: source.name,
      snapshot: source.snapshot,
    })
    .returning({ id: diagrams.id });
  if (!created) throw new Error("failed");

  const links = new Map<string, InnerDiagramLink>();
  for (const node of source.snapshot.nodes) {
    if (node.data.kind !== "infra") continue;
    const inner = pickInnerDiagram(children.filter((child) => child.parentNodeId === node.id));
    if (!inner) continue;
    links.set(
      node.id,
      await cloneDiagramTree(inner, { projectId: target.projectId, parentDiagramId: created.id, parentNodeId: node.id }, depth + 1),
    );
  }

  const hasStaleLinks = source.snapshot.nodes.some(
    (node) => node.data.kind === "infra" && node.data.childDiagramId && !links.has(node.id),
  );
  if (links.size || hasStaleLinks) {
    const snapshot: DiagramSnapshot = {
      ...source.snapshot,
      nodes: source.snapshot.nodes.map((node) => {
        if (node.data.kind !== "infra" || (!node.data.childDiagramId && !links.has(node.id))) return node;
        const link = links.get(node.id);
        return {
          ...node,
          data: link
            ? { ...node.data, childDiagramId: link.diagramId, childCount: link.nodeCount }
            : { ...node.data, childDiagramId: undefined },
        };
      }),
    };
    await db.update(diagrams).set({ snapshot }).where(eq(diagrams.id, created.id));
  }

  return { diagramId: created.id, nodeCount: innerContentCount(source.snapshot) };
}

export async function cloneInnerDiagrams(
  diagramId: string,
  copies: { nodeId: string; sourceDiagramId: string }[],
): Promise<Record<string, InnerDiagramLink>> {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");

  const result: Record<string, InnerDiagramLink> = {};
  for (const copy of copies) {
    const [source] = await db.select().from(diagrams).where(eq(diagrams.id, copy.sourceDiagramId)).limit(1);
    if (!source) continue;
    if (source.projectId !== bundle.diagram.projectId && !(await getAccess(source.projectId, user.id))) continue;
    result[copy.nodeId] = await cloneDiagramTree(source, {
      projectId: bundle.diagram.projectId,
      parentDiagramId: diagramId,
      parentNodeId: copy.nodeId,
    });
  }
  return result;
}

export async function createContainerDiagram(
  diagramId: string,
  containerNodeId: string,
  name: string,
  snapshot: DiagramSnapshot,
): Promise<InnerDiagramLink> {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");
  return cloneDiagramTree(
    { id: diagramId, name, snapshot },
    { projectId: bundle.diagram.projectId, parentDiagramId: diagramId, parentNodeId: containerNodeId },
  );
}

export type InnerNodeOption = { id: string; title: string; kind: "infra" | "group" };

function connectableNodes(snapshot: DiagramSnapshot): InnerNodeOption[] {
  return snapshot.nodes.flatMap((node) => {
    if (node.data.kind !== "infra" && node.data.kind !== "group") return [];
    return [{ id: node.id, title: node.data.title || "Untitled", kind: node.data.kind }];
  });
}

export async function listInnerNodes(childDiagramId: string): Promise<InnerNodeOption[]> {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(childDiagramId);
  if (!bundle) return [];
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access) return [];
  return connectableNodes(bundle.diagram.snapshot);
}

export async function importDiagramJson(diagramId: string, snapshot: DiagramSnapshot) {
  await saveDiagramSnapshot(diagramId, snapshot);
}
