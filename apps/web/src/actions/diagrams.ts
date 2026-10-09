"use server";

import { SignJWT } from "jose";
import { and, eq } from "drizzle-orm";
import {
  appendDiagramHistory,
  db,
  diagrams,
  getDiagramHistorySnapshot,
  listDiagramHistoryRows,
  users,
} from "@dataflow/db";
import {
  canEdit,
  emptySnapshot,
  isDiagramBundle,
  isFlatSnapshot,
  type DiagramBundle,
  type DiagramBundleChild,
  type DiagramSnapshot,
  type InfraNodeData,
  type MemberRole,
} from "@dataflow/shared";
import { auth } from "@/lib/auth";
import {
  buildBundleChildrenFromSnapshot,
  buildDiagramBundle,
  innerContentCount,
  materializeDiagramBundle,
  MAX_CLONE_DEPTH,
  type InnerDiagramLink,
} from "@/lib/diagram-tree";
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
  const previous = bundle.diagram.snapshot;
  await db
    .update(diagrams)
    .set({ snapshot, updatedAt: new Date() })
    .where(eq(diagrams.id, diagramId));
  await appendDiagramHistory({
    diagramId,
    projectId: bundle.diagram.projectId,
    userId: user.id,
    snapshot,
    previous,
  });
}

export async function listDiagramHistory(diagramId: string) {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access) throw new Error("forbidden");
  const rows = await listDiagramHistoryRows(diagramId);
  const names = new Map<string, string>();
  for (const row of rows) {
    if (!row.userId || names.has(row.userId)) continue;
    const [person] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    names.set(row.userId, person?.name ?? person?.email ?? "Someone");
  }
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    at: row.createdAt.getTime(),
    userName: row.userId ? names.get(row.userId) ?? null : null,
  }));
}

export async function getDiagramHistoryEntry(diagramId: string, entryId: string) {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");
  const row = await getDiagramHistorySnapshot(diagramId, entryId);
  if (!row) throw new Error("not found");
  return { id: row.id, label: row.label, snapshot: row.snapshot, at: row.createdAt.getTime() };
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

async function findInnerDiagram(diagramId: string, nodeId: string) {
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) return null;
  const node = bundle.diagram.snapshot.nodes.find((item) => item.id === nodeId);
  if (!node || node.data.kind !== "infra") return null;
  const data = node.data as InfraNodeData;

  const children = await db
    .select()
    .from(diagrams)
    .where(and(eq(diagrams.parentDiagramId, diagramId), eq(diagrams.parentNodeId, nodeId)));
  const chosen = pickInnerDiagram(children);
  if (chosen) {
    return {
      diagramId: chosen.id,
      nodeCount: innerContentCount(chosen.snapshot),
      node,
      data,
      bundle,
      needsLink: data.childDiagramId !== chosen.id,
    };
  }
  if (data.childDiagramId) {
    const [byId] = await db
      .select()
      .from(diagrams)
      .where(and(eq(diagrams.id, data.childDiagramId), eq(diagrams.projectId, bundle.diagram.projectId)))
      .limit(1);
    if (byId) {
      return {
        diagramId: byId.id,
        nodeCount: innerContentCount(byId.snapshot),
        node,
        data,
        bundle,
        needsLink: false,
      };
    }
  }
  return { diagramId: null as string | null, nodeCount: 0, node, data, bundle, needsLink: false };
}

export async function openOrCreateInnerDiagram(diagramId: string, nodeId: string) {
  const user = await requireUser();
  const found = await findInnerDiagram(diagramId, nodeId);
  if (!found) throw new Error("not found");
  const access = await getAccess(found.bundle.diagram.projectId, user.id);
  if (!access) throw new Error("forbidden");

  if (found.diagramId) {
    if (found.needsLink) {
      await linkInnerDiagram(
        diagramId,
        found.bundle.diagram.snapshot,
        nodeId,
        found.diagramId,
        found.nodeCount,
      );
    }
    return { diagramId: found.diagramId, nodeCount: found.nodeCount };
  }

  const [created] = await db
    .insert(diagrams)
    .values({
      projectId: found.bundle.diagram.projectId,
      parentDiagramId: diagramId,
      parentNodeId: nodeId,
      name: found.data.title,
      snapshot: emptySnapshot(),
    })
    .returning();
  if (!created) throw new Error("failed");
  await linkInnerDiagram(diagramId, found.bundle.diagram.snapshot, nodeId, created.id, 0);
  return { diagramId: created.id, nodeCount: 0 };
}

export async function resolveInnerDiagram(diagramId: string, nodeId: string, shareToken?: string) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await requireUser();
    const found = await findInnerDiagram(diagramId, nodeId);
    if (!found?.diagramId) return { diagramId: null as string | null, nodeCount: 0 };
    const access = await getAccess(found.bundle.diagram.projectId, user.id);
    if (!access) throw new Error("forbidden");
    return { diagramId: found.diagramId, nodeCount: found.nodeCount };
  }

  if (!shareToken) throw new Error("forbidden");
  const data = await getPublicProject(shareToken);
  if (!data?.root || data.project.linkAccess !== "view") throw new Error("forbidden");
  const found = await findInnerDiagram(diagramId, nodeId);
  if (!found?.diagramId) return { diagramId: null as string | null, nodeCount: 0 };
  if (found.bundle.diagram.projectId !== data.project.id) throw new Error("forbidden");
  return { diagramId: found.diagramId, nodeCount: found.nodeCount };
}

type DiagramRow = typeof diagrams.$inferSelect;

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

export type { DiagramBundle, DiagramBundleChild };

export async function exportDiagramBundle(
  diagramId: string,
  rootSnapshot?: DiagramSnapshot,
): Promise<DiagramBundle> {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access) throw new Error("forbidden");

  const snapshot = rootSnapshot ?? bundle.diagram.snapshot;
  return buildDiagramBundle(bundle.diagram.name, snapshot);
}

async function expandFlatSnapshotToChildren(
  userId: string,
  projectId: string,
  snapshot: DiagramSnapshot,
): Promise<DiagramBundleChild[]> {
  const children: DiagramBundleChild[] = [];
  const seen = new Set<string>();
  for (const node of snapshot.nodes) {
    if (node.data.kind !== "infra" || !node.data.childDiagramId) continue;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    const [source] = await db.select().from(diagrams).where(eq(diagrams.id, node.data.childDiagramId)).limit(1);
    if (!source) continue;
    if (source.projectId !== projectId && !(await getAccess(source.projectId, userId))) continue;
    children.push({
      parentNodeId: node.id,
      name: source.name,
      snapshot: source.snapshot,
      children: await buildBundleChildrenFromSnapshot(source.snapshot),
    });
  }
  return children;
}

export async function importDiagramJson(
  diagramId: string,
  payload: DiagramBundle | DiagramSnapshot,
): Promise<DiagramSnapshot> {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access || !canEdit(access.role)) throw new Error("forbidden");

  const projectId = bundle.diagram.projectId;

  let next: DiagramBundle;

  if (isDiagramBundle(payload)) {
    next = payload;
  } else if (isFlatSnapshot(payload)) {
    next = {
      version: 1,
      name: bundle.diagram.name,
      snapshot: payload,
      children: await expandFlatSnapshotToChildren(user.id, projectId, payload),
    };
  } else {
    throw new Error("invalid diagram json");
  }

  return materializeDiagramBundle(projectId, diagramId, next);
}
