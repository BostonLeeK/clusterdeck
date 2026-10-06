import { useCallback, useSyncExternalStore } from "react";
import type { DiagramEdge, DiagramNode, DiagramSnapshot } from "@dataflow/shared";

export const HISTORY_LIMIT = 50;
const COALESCE_MS = 2000;
const STORAGE_PREFIX = "dataflow:history:";

export type HistoryEntry = {
  id: string;
  label: string;
  group?: string;
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

type Change = { label: string; group: string };

function ids(items: { id: string }[]) {
  return items
    .map((item) => item.id)
    .sort()
    .join(",");
}

function describeChange(before: DiagramSnapshot, after: DiagramSnapshot): Change {
  const prevNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const added = after.nodes.filter((node) => !prevNodes.has(node.id));
  const removed = before.nodes.filter((node) => !nextNodes.has(node.id));
  if (added.length) {
    return { label: `Added ${count(added, nodeTitle(added[0]!), "nodes")}`, group: `add:${ids(added)}` };
  }
  if (removed.length) {
    return { label: `Deleted ${count(removed, nodeTitle(removed[0]!), "nodes")}`, group: `delete:${ids(removed)}` };
  }

  const changed = after.nodes.filter((node) => !same(node, prevNodes.get(node.id)));
  if (changed.length) {
    const edited = changed.filter((node) => !same(node.data, prevNodes.get(node.id)?.data));
    if (edited.length) {
      return { label: `Edited ${count(edited, nodeTitle(edited[0]!), "nodes")}`, group: `edit:${ids(edited)}` };
    }
    const resized = changed.filter((node) => {
      const prev = prevNodes.get(node.id);
      return prev?.width !== node.width || prev?.height !== node.height;
    });
    if (resized.length) {
      return { label: `Resized ${count(resized, nodeTitle(resized[0]!), "nodes")}`, group: `resize:${ids(resized)}` };
    }
    const regrouped = changed.filter((node) => prevNodes.get(node.id)?.parentId !== node.parentId);
    if (regrouped.length) {
      return {
        label: `Regrouped ${count(regrouped, nodeTitle(regrouped[0]!), "nodes")}`,
        group: `regroup:${ids(regrouped)}`,
      };
    }
    return { label: `Moved ${count(changed, nodeTitle(changed[0]!), "nodes")}`, group: `move:${ids(changed)}` };
  }

  const prevEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const nextEdgeIds = new Set(after.edges.map((edge) => edge.id));
  const addedEdges = after.edges.filter((edge) => !prevEdges.has(edge.id));
  const removedEdges = before.edges.filter((edge) => !nextEdgeIds.has(edge.id));
  if (addedEdges.length) {
    return {
      label:
        addedEdges.length === 1
          ? `Connected ${edgeName(addedEdges[0]!, nextNodes)}`
          : `Added ${addedEdges.length} connections`,
      group: `connect:${ids(addedEdges)}`,
    };
  }
  if (removedEdges.length) {
    return {
      label:
        removedEdges.length === 1
          ? `Removed connection ${edgeName(removedEdges[0]!, prevNodes)}`
          : `Removed ${removedEdges.length} connections`,
      group: `disconnect:${ids(removedEdges)}`,
    };
  }
  const changedEdge = after.edges.find((edge) => !same(edge, prevEdges.get(edge.id)));
  if (changedEdge) {
    return { label: `Edited connection ${edgeName(changedEdge, nextNodes)}`, group: `edge:${changedEdge.id}` };
  }
  if (!same(before.meta, after.meta)) return { label: "Updated tags and flows", group: "meta" };
  return { label: "Changed diagram", group: "other" };
}

export function recordHistory(
  diagramId: string,
  before: DiagramSnapshot,
  after: DiagramSnapshot,
  change: Change = describeChange(before, after),
) {
  const state = read(diagramId);
  const current = state.entries.at(-1)?.snapshot ?? state.base;
  if (current ? same(current, after) : same(before, after)) return;
  const base = state.entries.length || state.base ? state.base : before;
  const now = Date.now();
  const last = state.entries.at(-1);
  let entries: HistoryEntry[];
  if (last && last.group === change.group && now - last.at < COALESCE_MS) {
    entries = [...state.entries.slice(0, -1), { ...last, label: change.label, at: now, snapshot: after }];
  } else {
    entries = [
      ...state.entries,
      { id: crypto.randomUUID(), label: change.label, group: change.group, at: now, snapshot: after },
    ];
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
  recordHistory(diagramId, current, target, {
    label: `Restored to: ${entry ? entry.label : "session start"}`,
    group: `restore:${crypto.randomUUID()}`,
  });
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
