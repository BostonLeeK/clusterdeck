import { useCallback, useSyncExternalStore } from "react";
import {
  describeDiagramChange,
  snapshotsEqual,
  type DiagramChange,
  type DiagramSnapshot,
} from "@dataflow/shared";

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

export function recordHistory(
  diagramId: string,
  before: DiagramSnapshot,
  after: DiagramSnapshot,
  change: DiagramChange = describeDiagramChange(before, after),
) {
  const state = read(diagramId);
  const current = state.entries.at(-1)?.snapshot ?? state.base;
  if (current ? snapshotsEqual(current, after) : snapshotsEqual(before, after)) return;
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

export function restoreToSnapshot(
  diagramId: string,
  current: DiagramSnapshot,
  target: DiagramSnapshot,
  label: string,
) {
  recordHistory(diagramId, current, target, {
    label: `Restored to: ${label}`,
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
