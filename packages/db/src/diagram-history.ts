import { and, desc, eq, sql } from "drizzle-orm";
import { describeDiagramChange, snapshotsEqual, type DiagramSnapshot } from "@dataflow/shared";
import { db } from "./client";
import { diagramHistory } from "./schema";

export const SERVER_HISTORY_LIMIT = 100;
const COALESCE_MS = 5000;

export async function appendDiagramHistory(opts: {
  diagramId: string;
  projectId: string;
  userId?: string | null;
  snapshot: DiagramSnapshot;
  previous?: DiagramSnapshot | null;
  label?: string;
}) {
  if (opts.previous && snapshotsEqual(opts.previous, opts.snapshot)) return null;

  const change = opts.previous
    ? describeDiagramChange(opts.previous, opts.snapshot)
    : { label: opts.label ?? "Saved diagram", group: "save" };
  const label = opts.label ?? change.label;
  const userId = opts.userId && opts.userId !== "guest" ? opts.userId : null;

  const [latest] = await db
    .select({
      id: diagramHistory.id,
      label: diagramHistory.label,
      createdAt: diagramHistory.createdAt,
      snapshot: diagramHistory.snapshot,
    })
    .from(diagramHistory)
    .where(eq(diagramHistory.diagramId, opts.diagramId))
    .orderBy(desc(diagramHistory.createdAt))
    .limit(1);

  if (latest && snapshotsEqual(latest.snapshot, opts.snapshot)) return latest.id;

  const now = Date.now();
  if (latest && latest.label === label && now - latest.createdAt.getTime() < COALESCE_MS) {
    await db
      .update(diagramHistory)
      .set({
        snapshot: opts.snapshot,
        userId,
        createdAt: new Date(),
      })
      .where(eq(diagramHistory.id, latest.id));
    return latest.id;
  }

  const [created] = await db
    .insert(diagramHistory)
    .values({
      diagramId: opts.diagramId,
      projectId: opts.projectId,
      userId,
      label,
      snapshot: opts.snapshot,
    })
    .returning({ id: diagramHistory.id });

  const overflow = await db
    .select({ id: diagramHistory.id })
    .from(diagramHistory)
    .where(eq(diagramHistory.diagramId, opts.diagramId))
    .orderBy(desc(diagramHistory.createdAt))
    .offset(SERVER_HISTORY_LIMIT);

  for (const row of overflow) {
    await db.delete(diagramHistory).where(eq(diagramHistory.id, row.id));
  }

  return created?.id ?? null;
}

export async function listDiagramHistoryRows(diagramId: string, limit = SERVER_HISTORY_LIMIT) {
  return db
    .select({
      id: diagramHistory.id,
      label: diagramHistory.label,
      createdAt: diagramHistory.createdAt,
      userId: diagramHistory.userId,
    })
    .from(diagramHistory)
    .where(eq(diagramHistory.diagramId, diagramId))
    .orderBy(desc(diagramHistory.createdAt))
    .limit(limit);
}

export async function getDiagramHistorySnapshot(diagramId: string, entryId: string) {
  const [row] = await db
    .select({
      id: diagramHistory.id,
      label: diagramHistory.label,
      snapshot: diagramHistory.snapshot,
      createdAt: diagramHistory.createdAt,
    })
    .from(diagramHistory)
    .where(and(eq(diagramHistory.id, entryId), eq(diagramHistory.diagramId, diagramId)))
    .limit(1);
  return row ?? null;
}

export async function countDiagramHistory(diagramId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(diagramHistory)
    .where(eq(diagramHistory.diagramId, diagramId));
  return row?.count ?? 0;
}
