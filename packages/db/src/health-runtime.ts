import { eq, and } from "drizzle-orm";
import { db } from "./client";
import { healthCheckRuntime } from "./schema";

export type HealthRuntimeRow = {
  diagramId: string;
  nodeId: string;
  failureTimes: string[];
  lastOkAt: Date | null;
  lastAlertAt: Date | null;
  lastProbeAt: Date | null;
  updatedAt: Date;
};

export async function getHealthRuntime(diagramId: string, nodeId: string) {
  const [row] = await db
    .select()
    .from(healthCheckRuntime)
    .where(and(eq(healthCheckRuntime.diagramId, diagramId), eq(healthCheckRuntime.nodeId, nodeId)))
    .limit(1);
  return row ?? null;
}

export async function upsertHealthRuntime(input: {
  diagramId: string;
  nodeId: string;
  failureTimes?: string[];
  lastOkAt?: Date | null;
  lastAlertAt?: Date | null;
  lastProbeAt?: Date | null;
}): Promise<HealthRuntimeRow> {
  const now = new Date();
  const [row] = await db
    .insert(healthCheckRuntime)
    .values({
      diagramId: input.diagramId,
      nodeId: input.nodeId,
      failureTimes: input.failureTimes ?? [],
      lastOkAt: input.lastOkAt ?? null,
      lastAlertAt: input.lastAlertAt ?? null,
      lastProbeAt: input.lastProbeAt ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [healthCheckRuntime.diagramId, healthCheckRuntime.nodeId],
      set: {
        ...(input.failureTimes !== undefined ? { failureTimes: input.failureTimes } : {}),
        ...(input.lastOkAt !== undefined ? { lastOkAt: input.lastOkAt } : {}),
        ...(input.lastAlertAt !== undefined ? { lastAlertAt: input.lastAlertAt } : {}),
        ...(input.lastProbeAt !== undefined ? { lastProbeAt: input.lastProbeAt } : {}),
        updatedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error("failed to upsert health runtime");
  return row;
}
