import { eq } from "drizzle-orm";
import { db } from "./client";
import { diagramNodeObservations } from "./schema";

export type ObservationStatus = "healthy" | "degraded" | "unknown" | "offline";

export type NodeObservationRow = {
  diagramId: string;
  nodeId: string;
  status: ObservationStatus;
  checkedAt: Date;
  source: string;
  message: string | null;
  staleAfterSec: number;
};

export type UpsertObservationInput = {
  diagramId: string;
  nodeId: string;
  status: ObservationStatus;
  source?: string;
  message?: string | null;
  staleAfterSec?: number;
  checkedAt?: Date;
};

export async function upsertNodeObservation(input: UpsertObservationInput): Promise<NodeObservationRow> {
  const checkedAt = input.checkedAt ?? new Date();
  const source = input.source?.trim() || "external";
  const staleAfterSec =
    typeof input.staleAfterSec === "number" && input.staleAfterSec > 0
      ? Math.min(Math.floor(input.staleAfterSec), 86_400)
      : 300;
  const message = input.message?.trim() ? input.message.trim().slice(0, 500) : null;

  const [row] = await db
    .insert(diagramNodeObservations)
    .values({
      diagramId: input.diagramId,
      nodeId: input.nodeId,
      status: input.status,
      checkedAt,
      source,
      message,
      staleAfterSec,
    })
    .onConflictDoUpdate({
      target: [diagramNodeObservations.diagramId, diagramNodeObservations.nodeId],
      set: {
        status: input.status,
        checkedAt,
        source,
        message,
        staleAfterSec,
      },
    })
    .returning();

  if (!row) throw new Error("failed to upsert observation");
  return row;
}

export async function listDiagramObservations(diagramId: string): Promise<NodeObservationRow[]> {
  return db
    .select()
    .from(diagramNodeObservations)
    .where(eq(diagramNodeObservations.diagramId, diagramId));
}

export async function upsertNodeObservations(
  items: UpsertObservationInput[],
): Promise<NodeObservationRow[]> {
  const rows: NodeObservationRow[] = [];
  for (const item of items) {
    rows.push(await upsertNodeObservation(item));
  }
  return rows;
}
