import { eq } from "drizzle-orm";
import { db, diagrams } from "@dataflow/db";
import type { DiagramBundle, DiagramBundleChild, DiagramSnapshot } from "@dataflow/shared";

export const MAX_CLONE_DEPTH = 12;

export type InnerDiagramLink = { diagramId: string; nodeCount: number };

export function innerContentCount(snapshot: DiagramSnapshot) {
  return snapshot.nodes.filter((node) => node.type !== "port").length;
}

export function remapSnapshotLinks(
  snapshot: DiagramSnapshot,
  links: Map<string, InnerDiagramLink>,
): DiagramSnapshot {
  return {
    ...snapshot,
    nodes: snapshot.nodes.map((node) => {
      if (node.data.kind !== "infra") return node;
      const link = links.get(node.id);
      if (link) {
        return {
          ...node,
          data: { ...node.data, childDiagramId: link.diagramId, childCount: link.nodeCount },
        };
      }
      if (node.data.childDiagramId) {
        return { ...node, data: { ...node.data, childDiagramId: undefined } };
      }
      return node;
    }),
  };
}

export async function buildBundleChildrenFromSnapshot(
  snapshot: DiagramSnapshot,
  depth = 0,
): Promise<DiagramBundleChild[]> {
  if (depth >= MAX_CLONE_DEPTH) return [];
  const children: DiagramBundleChild[] = [];
  const seen = new Set<string>();

  for (const node of snapshot.nodes) {
    if (node.data.kind !== "infra" || !node.data.childDiagramId) continue;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    const [row] = await db.select().from(diagrams).where(eq(diagrams.id, node.data.childDiagramId)).limit(1);
    if (!row) continue;
    children.push({
      parentNodeId: node.id,
      name: row.name,
      snapshot: row.snapshot,
      children: await buildBundleChildrenFromSnapshot(row.snapshot, depth + 1),
    });
  }
  return children;
}

export async function buildDiagramBundle(
  name: string,
  snapshot: DiagramSnapshot,
): Promise<DiagramBundle> {
  return {
    version: 1,
    name,
    snapshot,
    children: await buildBundleChildrenFromSnapshot(snapshot),
  };
}

export async function deleteChildDiagramTrees(parentDiagramId: string) {
  const children = await db
    .select({ id: diagrams.id })
    .from(diagrams)
    .where(eq(diagrams.parentDiagramId, parentDiagramId));
  for (const child of children) {
    await deleteChildDiagramTrees(child.id);
    await db.delete(diagrams).where(eq(diagrams.id, child.id));
  }
}

export async function materializeBundleChildren(
  projectId: string,
  parentDiagramId: string,
  children: DiagramBundleChild[],
  depth = 0,
): Promise<Map<string, InnerDiagramLink>> {
  const links = new Map<string, InnerDiagramLink>();
  if (depth >= MAX_CLONE_DEPTH) return links;

  for (const child of children) {
    const [created] = await db
      .insert(diagrams)
      .values({
        projectId,
        parentDiagramId,
        parentNodeId: child.parentNodeId,
        name: child.name,
        snapshot: child.snapshot,
      })
      .returning({ id: diagrams.id });
    if (!created) continue;

    const nested = await materializeBundleChildren(projectId, created.id, child.children, depth + 1);
    let snapshot = child.snapshot;
    if (nested.size) {
      snapshot = remapSnapshotLinks(child.snapshot, nested);
      await db.update(diagrams).set({ snapshot, ydocState: null }).where(eq(diagrams.id, created.id));
    } else if (child.snapshot.nodes.some((node) => node.data.kind === "infra" && node.data.childDiagramId)) {
      snapshot = remapSnapshotLinks(child.snapshot, new Map());
      await db.update(diagrams).set({ snapshot, ydocState: null }).where(eq(diagrams.id, created.id));
    }

    links.set(child.parentNodeId, {
      diagramId: created.id,
      nodeCount: innerContentCount(snapshot),
    });
  }
  return links;
}

export async function materializeDiagramBundle(
  projectId: string,
  rootDiagramId: string,
  bundle: DiagramBundle,
): Promise<DiagramSnapshot> {
  await deleteChildDiagramTrees(rootDiagramId);
  const links = await materializeBundleChildren(projectId, rootDiagramId, bundle.children);
  const nextSnapshot = remapSnapshotLinks(bundle.snapshot, links);
  await db
    .update(diagrams)
    .set({
      name: bundle.name,
      snapshot: nextSnapshot,
      ydocState: null,
      updatedAt: new Date(),
    })
    .where(eq(diagrams.id, rootDiagramId));
  return nextSnapshot;
}

export async function createProjectFromBundle(
  projectId: string,
  bundle: DiagramBundle,
): Promise<{ diagramId: string }> {
  const [root] = await db
    .insert(diagrams)
    .values({
      projectId,
      name: bundle.name,
      snapshot: bundle.snapshot,
    })
    .returning({ id: diagrams.id });
  if (!root) throw new Error("failed");
  await materializeDiagramBundle(projectId, root.id, bundle);
  return { diagramId: root.id };
}
