"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  resolveLiveStatus,
  type NodeHealthConfig,
  type NodeObservation,
  type NodeStatus,
  type ResolvedLiveStatus,
} from "@dataflow/shared";

type LiveStatusContextValue = {
  observations: Map<string, NodeObservation>;
  applyObservations: (items: NodeObservation[]) => void;
  resolve: (nodeId: string, documented?: NodeStatus, health?: NodeHealthConfig | null) => ResolvedLiveStatus;
};

const LiveStatusContext = createContext<LiveStatusContextValue>({
  observations: new Map(),
  applyObservations: () => undefined,
  resolve: (_nodeId, documented) => ({ status: documented ?? "unknown", mode: "manual" }),
});

function mergeObservations(
  current: Map<string, NodeObservation>,
  items: NodeObservation[],
) {
  if (!items.length) return current;
  const next = new Map(current);
  for (const item of items) next.set(item.nodeId, item);
  return next;
}

export function LiveStatusProvider({
  diagramId,
  enabled = true,
  children,
}: {
  diagramId: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const [observations, setObservations] = useState<Map<string, NodeObservation>>(() => new Map());
  const [now, setNow] = useState(() => Date.now());

  const applyObservations = useCallback((items: NodeObservation[]) => {
    setObservations((current) => mergeObservations(current, items));
  }, []);

  useEffect(() => {
    if (!enabled || !diagramId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/health/${encodeURIComponent(diagramId)}`, {
          credentials: "include",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { observations?: NodeObservation[] };
        if (cancelled || !payload.observations) return;
        setObservations(new Map(payload.observations.map((item) => [item.nodeId, item])));
      } catch {
        return;
      }
    };

    void load();
    const poll = setInterval(() => void load(), 12_000);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [diagramId, enabled]);

  const value = useMemo<LiveStatusContextValue>(
    () => ({
      observations,
      applyObservations,
      resolve: (nodeId, documented, health) =>
        resolveLiveStatus(documented, observations.get(nodeId), health, now),
    }),
    [applyObservations, now, observations],
  );

  return <LiveStatusContext.Provider value={value}>{children}</LiveStatusContext.Provider>;
}

export function useLiveStatus() {
  return useContext(LiveStatusContext);
}
