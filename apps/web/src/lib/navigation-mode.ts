import { useSyncExternalStore } from "react";

export type NavigationMode = "mouse" | "trackpad";

const STORAGE_KEY = "dataflow:navigation-mode";
const listeners = new Set<() => void>();

function readStored(): NavigationMode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "mouse" || value === "trackpad" ? value : null;
  } catch {
    return null;
  }
}

function defaultMode(): NavigationMode {
  return /Mac/i.test(window.navigator.userAgent) ? "trackpad" : "mouse";
}

function getSnapshot(): NavigationMode {
  return readStored() ?? defaultMode();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setNavigationMode(mode: NavigationMode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    return;
  }
  for (const listener of listeners) listener();
}

export function detectTrackpad(event: WheelEvent) {
  if (event.deltaX === 0 || event.ctrlKey || event.shiftKey || readStored()) return;
  setNavigationMode("trackpad");
}

export function useNavigationMode() {
  return useSyncExternalStore(subscribe, getSnapshot, () => "mouse" as const);
}
