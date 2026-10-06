import type { Viewport } from "@xyflow/react";

const PREFIX = "dataflow:viewport:";

function storageKey(diagramId: string) {
  return `${PREFIX}${diagramId}`;
}

function isViewport(value: unknown): value is Viewport {
  if (!value || typeof value !== "object") return false;
  const { x, y, zoom } = value as Record<string, unknown>;
  return [x, y, zoom].every((item) => typeof item === "number" && Number.isFinite(item)) && (zoom as number) > 0;
}

export function loadViewport(diagramId: string): Viewport | null {
  try {
    const raw = window.localStorage.getItem(storageKey(diagramId));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isViewport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveViewport(diagramId: string, viewport: Viewport) {
  if (!isViewport(viewport)) return;
  try {
    window.localStorage.setItem(storageKey(diagramId), JSON.stringify(viewport));
  } catch {
    return;
  }
}
