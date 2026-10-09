import type { NodeHealthConfig, NodeStatus } from "./node-types";

export type LiveStatusMode = "manual" | "live" | "stale";

export type NodeObservation = {
  nodeId: string;
  status: NodeStatus;
  checkedAt: string;
  source: string;
  message?: string | null;
  staleAfterSec: number;
};

export type ResolvedLiveStatus = {
  status: NodeStatus;
  mode: LiveStatusMode;
  observation?: NodeObservation;
  ageSec?: number;
};

export function defaultStaleAfterSec(health?: NodeHealthConfig | null) {
  if (!health) return 300;
  if (typeof health.staleAfterSec === "number" && health.staleAfterSec > 0) return health.staleAfterSec;
  if (typeof health.intervalSec === "number" && health.intervalSec > 0) {
    return Math.max(60, health.intervalSec * 3);
  }
  return 300;
}

export function resolveLiveStatus(
  documented: NodeStatus | undefined,
  observation?: NodeObservation | null,
  health?: NodeHealthConfig | null,
  now = Date.now(),
): ResolvedLiveStatus {
  const fallback = documented ?? "unknown";
  if (!observation) return { status: fallback, mode: "manual" };

  const checkedAt = Date.parse(observation.checkedAt);
  if (!Number.isFinite(checkedAt)) return { status: fallback, mode: "manual", observation };

  const ageSec = Math.max(0, Math.floor((now - checkedAt) / 1000));
  const staleAfter =
    observation.staleAfterSec > 0 ? observation.staleAfterSec : defaultStaleAfterSec(health);

  if (ageSec > staleAfter) {
    return { status: fallback, mode: "stale", observation, ageSec };
  }

  return { status: observation.status, mode: "live", observation, ageSec };
}

export function observationFromRow(row: {
  nodeId: string;
  status: NodeStatus | string;
  checkedAt: Date | string;
  source: string;
  message?: string | null;
  staleAfterSec: number;
}): NodeObservation {
  return {
    nodeId: row.nodeId,
    status: row.status as NodeStatus,
    checkedAt: typeof row.checkedAt === "string" ? row.checkedAt : row.checkedAt.toISOString(),
    source: row.source,
    message: row.message ?? null,
    staleAfterSec: row.staleAfterSec,
  };
}
