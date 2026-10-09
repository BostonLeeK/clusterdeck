import type { DiagramSnapshot } from "./node-types";

export type DiagramBundleChild = {
  parentNodeId: string;
  name: string;
  snapshot: DiagramSnapshot;
  children: DiagramBundleChild[];
};

export type DiagramBundle = {
  version: 1;
  name: string;
  snapshot: DiagramSnapshot;
  children: DiagramBundleChild[];
};

export function isDiagramBundle(value: unknown): value is DiagramBundle {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    row.version === 1 &&
    row.snapshot != null &&
    typeof row.snapshot === "object" &&
    Array.isArray((row.snapshot as DiagramSnapshot).nodes) &&
    Array.isArray((row.snapshot as DiagramSnapshot).edges) &&
    Array.isArray(row.children)
  );
}

export function isFlatSnapshot(value: unknown): value is DiagramSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Array.isArray(row.nodes) && Array.isArray(row.edges) && row.version !== 1;
}
