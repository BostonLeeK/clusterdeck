import { useCallback, useSyncExternalStore } from "react";
import type { DiagramEdge, DiagramNode, DiagramSnapshot } from "@dataflow/shared";

export const HISTORY_LIMIT = 50;
const COALESCE_MS = 1500;
const STORAGE_PREFIX = "dataflow:history:";

export type HistoryEntry = {
  id: string;
  label: string;
  at: number;
  snapshot: DiagramSnapshot;
};

type HistoryState = {
  base: DiagramSnapshot | null;
  entries: HistoryEntry[];
  redo: HistoryEntry[];
};

const EMPTY: HistoryState = { base: null, entries: [], redo: [] };
const states = new Map<string, HistoryState>();
const listeners = new Map<string, Set<() => void>>();

function storageKey(diagramId: string) {
  return `${STORAGE_PREFIX}${diagramId}`;
}

function read(diagramId: string): HistoryState {
  const cached = states.get(diagramId);
  if (cached) return cached;
  let state = EMPTY;
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(storageKey(diagramId));
      if (raw) state = JSON.parse(raw) as HistoryState;
    } catch {
      state = EMPTY;
    }
  }
  states.set(diagramId, state);
  return state;
}

function write(diagramId: string, state: HistoryState) {
  states.set(diagramId, state);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(storageKey(diagramId), JSON.stringify(state));
    } catch {
      window.sessionStorage.removeItem(storageKey(diagramId));
    }
  }
  listeners.get(diagramId)?.forEach((listener) => listener());
}

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nodeTitle(node: DiagramNode) {
  const title = (node.data as { title?: string }).title?.trim();
  return title ? `"${title}"` : node.type;
}

function count(items: unknown[], one: string, many: string) {
  return items.length === 1 ? one : `${items.length} ${many}`;
}

function edgeName(edge: DiagramEdge, nodes: Map<string, DiagramNode>) {
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  return `${source ? nodeTitle(source) : "?"} → ${target ? nodeTitle(target) : "?"}`;
}

export function describeChange(before: DiagramSnapshot, after: DiagramSnapshot): string {
  const prevNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const added = after.nodes.filter((node) => !prevNodes.has(node.id));
  const removed = before.nodes.filter((node) => !nextNodes.has(node.id));
  if (added.length) return `Added ${count(added, nodeTitle(added[0]!), "nodes")}`;
  if (removed.length) return `Deleted ${count(removed, nodeTitle(removed[0]!), "nodes")}`;

  const changed = after.nodes.filter((node) => !same(node, prevNodes.get(node.id)));
  if (changed.length) {
    const edited = changed.filter((node) => !same(node.data, prevNodes.get(node.id)?.data));
    if (edited.length) return `Edited ${count(edited, nodeTitle(edited[0]!), "nodes")}`;
    const resized = changed.filter((node) => {
      const prev = prevNodes.get(node.id);
      return prev?.width !== node.width || prev?.height !== node.height;
    });
    if (resized.length) return `Resized ${count(resized, nodeTitle(resized[0]!), "nodes")}`;
    const regrouped = changed.filter((node) => prevNodes.get(node.id)?.parentId !== node.parentId);
    if (regrouped.length) return `Regrouped ${count(regrouped, nodeTitle(regrouped[0]!), "nodes")}`;
    return `Moved ${count(changed, nodeTitle(changed[0]!), "nodes")}`;
  }

  const prevEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const nextEdgeIds = new Set(after.edges.map((edge) => edge.id));
  const addedEdges = after.edges.filter((edge) => !prevEdges.has(edge.id));
  const removedEdges = before.edges.filter((edge) => !nextEdgeIds.has(edge.id));
  if (addedEdges.length) {
    return addedEdges.length === 1
      ? `Connected ${edgeName(addedEdges[0]!, nextNodes)}`
      : `Added ${addedEdges.length} connections`;
  }
  if (removedEdges.length) {
    return removedEdges.length === 1
      ? `Removed connection ${edgeName(removedEdges[0]!, prevNodes)}`
      : `Removed ${removedEdges.length} connections`;
  }
  const changedEdge = after.edges.find((edge) => !same(edge, prevEdges.get(edge.id)));
  if (changedEdge) return `Edited connection ${edgeName(changedEdge, nextNodes)}`;
  if (!same(before.meta, after.meta)) return "Updated tags and flows";
  return "Changed diagram";
}

export function recordHistory(
  diagramId: string,
  before: DiagramSnapshot,
  after: DiagramSnapshot,
  label = describeChange(before, after),
) {
  const state = read(diagramId);
  const current = state.entries.at(-1)?.snapshot ?? state.base;
  if (current ? same(current, after) : same(before, after)) return;
  const base = state.entries.length || state.base ? state.base : before;
  const now = Date.now();
  const last = state.entries.at(-1);
  let entries: HistoryEntry[];
  if (last && last.label === label && now - last.at < COALESCE_MS) {
    entries = [...state.entries.slice(0, -1), { ...last, at: now, snapshot: after }];
  } else {
    entries = [...state.entries, { id: crypto.randomUUID(), label, at: now, snapshot: after }];
  }
  let nextBase = base;
  while (entries.length > HISTORY_LIMIT) {
    nextBase = entries[0]!.snapshot;
    entries = entries.slice(1);
  }
  write(diagramId, { base: nextBase, entries, redo: [] });
}

export function undoHistory(diagramId: string): DiagramSnapshot | null {
  const state = read(diagramId);
  const last = state.entries.at(-1);
  if (!last) return null;
  const entries = state.entries.slice(0, -1);
  const target = entries.at(-1)?.snapshot ?? state.base;
  if (!target) return null;
  write(diagramId, { base: state.base, entries, redo: [...state.redo, last] });
  return target;
}

export function redoHistory(diagramId: string): DiagramSnapshot | null {
  const state = read(diagramId);
  const next = state.redo.at(-1);
  if (!next) return null;
  write(diagramId, {
    base: state.base,
    entries: [...state.entries, { ...next, at: Date.now() }],
    redo: state.redo.slice(0, -1),
  });
  return next.snapshot;
}

export function restoreHistory(diagramId: string, entryId: string, current: DiagramSnapshot) {
  const state = read(diagramId);
  const entry = entryId === "base" ? null : state.entries.find((item) => item.id === entryId);
  const target = entry ? entry.snapshot : state.base;
  if (!target) return null;
  recordHistory(diagramId, current, target, `Restored to: ${entry ? entry.label : "session start"}`);
  return target;
}

function subscribe(diagramId: string, listener: () => void) {
  const set = listeners.get(diagramId) ?? new Set();
  set.add(listener);
  listeners.set(diagramId, set);
  return () => {
    set.delete(listener);
  };
}

export function useHistory(diagramId: string) {
  const subscribeToDiagram = useCallback(
    (listener: () => void) => subscribe(diagramId, listener),
    [diagramId],
  );
  return useSyncExternalStore(subscribeToDiagram, () => read(diagramId), () => EMPTY);
}
