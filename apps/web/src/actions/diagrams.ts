"use server";

import { SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { db, diagrams } from "@dataflow/db";
import { canEdit, emptySnapshot, type DiagramSnapshot, type InfraNodeData } from "@dataflow/shared";
import { getAccess, getDiagramWithTrail, requireUser } from "@/lib/queries";

const secret = new TextEncoder().encode(process.env.REALTIME_SECRET ?? "dev-realtime-secret");

export async function issueRealtimeToken(diagramId: string) {
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
  return { token, role: access.role, readOnly: !canEdit(access.role) };
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

export async function openOrCreateInnerDiagram(diagramId: string, nodeId: string) {
  const user = await requireUser();
  const bundle = await getDiagramWithTrail(diagramId);
  if (!bundle) throw new Error("not found");
  const access = await getAccess(bundle.diagram.projectId, user.id);
  if (!access) throw new Error("forbidden");
  const node = bundle.diagram.snapshot.nodes.find((item) => item.id === nodeId);
  if (!node || node.data.kind !== "infra") throw new Error("invalid node");
  const data = node.data as InfraNodeData;
  if (data.childDiagramId) return { diagramId: data.childDiagramId };

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
  const nextSnapshot: DiagramSnapshot = {
    ...bundle.diagram.snapshot,
    nodes: bundle.diagram.snapshot.nodes.map((item) =>
      item.id === nodeId && item.data.kind === "infra"
        ? { ...item, data: { ...item.data, childDiagramId: created.id, childCount: 0 } }
        : item,
    ),
  };
  await db.update(diagrams).set({ snapshot: nextSnapshot }).where(eq(diagrams.id, diagramId));
  return { diagramId: created.id };
}

export async function importDiagramJson(diagramId: string, snapshot: DiagramSnapshot) {
  await saveDiagramSnapshot(diagramId, snapshot);
}
