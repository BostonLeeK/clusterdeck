"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import * as Y from "yjs";
import {
  applySnapshot,
  getEdgeMap,
  getNodeMap,
  snapshotFromDoc,
  type DiagramEdge,
  type DiagramNode,
  type DiagramSnapshot,
  type MemberRole,
} from "@dataflow/shared";
import { fromFlowNode, toFlowEdges, toFlowNodes } from "@/lib/diagram";
import { issueRealtimeToken, saveDiagramSnapshot } from "@/actions/diagrams";

export type PresenceUser = {
  clientId: number;
  name?: string;
  color: string;
  cursor?: { x: number; y: number };
};

const COLORS = ["#818cf8", "#22d3ee", "#34d399", "#f472b6", "#fbbf24"];
const LOCAL_ORIGIN = "local";

function flowNodesToDiagram(nodes: Node[]): DiagramNode[] {
  return nodes.map((node) =>
    fromFlowNode({
      ...node,
      data: node.data as DiagramNode["data"],
    }),
  );
}

function flowEdgesToDiagram(edges: Edge[]): DiagramEdge[] {
  return edges.map((edge) => {
    const data = edge.data as { animated?: boolean } | undefined;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: typeof edge.label === "string" ? edge.label : undefined,
      animated: Boolean(data?.animated ?? edge.animated),
    };
  });
}

export function useDiagramSync(opts: {
  diagramId: string;
  initial: DiagramSnapshot;
  user: { name?: string | null; email?: string | null };
  forceReadOnly?: boolean;
}) {
  const docRef = useRef<Y.Doc>(new Y.Doc());
  const undoRef = useRef<Y.UndoManager | null>(null);
  const nodesRef = useRef<Node[]>(toFlowNodes(opts.initial.nodes));
  const edgesRef = useRef<Edge[]>(toFlowEdges(opts.initial.edges));
  const [nodes, setNodesState] = useState<Node[]>(nodesRef.current);
  const [edges, setEdgesState] = useState<Edge[]>(edgesRef.current);
  const [saved, setSaved] = useState(true);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [role, setRole] = useState<MemberRole>(opts.forceReadOnly ? "viewer" : "editor");
  const [readOnly, setReadOnly] = useState(Boolean(opts.forceReadOnly));
  const initialRef = useRef(opts.initial);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cursorTimer = useRef(0);

  const setNodes = useCallback((updater: Node[] | ((current: Node[]) => Node[])) => {
    setNodesState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      nodesRef.current = next;
      return next;
    });
  }, []);

  const setEdges = useCallback((updater: Edge[] | ((current: Edge[]) => Edge[])) => {
    setEdgesState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      edgesRef.current = next;
      return next;
    });
  }, []);

  const hydrateFromDoc = useCallback((doc: Y.Doc) => {
    const snapshot = snapshotFromDoc(doc);
    const selectedNodes = new Set(nodesRef.current.filter((node) => node.selected).map((node) => node.id));
    const selectedEdges = new Set(edgesRef.current.filter((edge) => edge.selected).map((edge) => edge.id));
    const nextNodes = toFlowNodes(snapshot.nodes).map((node) => ({
      ...node,
      selected: selectedNodes.has(node.id),
    }));
    const nextEdges = toFlowEdges(snapshot.edges).map((edge) => ({
      ...edge,
      selected: selectedEdges.has(edge.id),
    }));
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodesState(nextNodes);
    setEdgesState(nextEdges);
  }, []);

  const persistLocal = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const doc = docRef.current;
      const snapshot = {
        nodes: flowNodesToDiagram(nextNodes),
        edges: flowEdgesToDiagram(nextEdges),
      };
      applySnapshot(doc, snapshot, LOCAL_ORIGIN);
      setSaved(false);
      if (!providerRef.current) {
        if (persistTimer.current) clearTimeout(persistTimer.current);
        persistTimer.current = setTimeout(() => {
          void saveDiagramSnapshot(opts.diagramId, snapshot).then(() => setSaved(true));
        }, 400);
      }
    },
    [opts.diagramId],
  );

  useEffect(() => {
    const doc = docRef.current;
    applySnapshot(doc, initialRef.current);
    undoRef.current = new Y.UndoManager([getNodeMap(doc), getEdgeMap(doc)]);

    const onYChange = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) return;
      hydrateFromDoc(doc);
    };
    getNodeMap(doc).observe(onYChange);
    getEdgeMap(doc).observe(onYChange);

    let cancelled = false;
    if (opts.forceReadOnly) {
      return () => {
        cancelled = true;
        getNodeMap(doc).unobserve(onYChange);
        getEdgeMap(doc).unobserve(onYChange);
      };
    }

    void issueRealtimeToken(opts.diagramId)
      .then(({ token, role: nextRole, readOnly: nextReadOnly }) => {
        if (cancelled) return;
        setRole(nextRole);
        setReadOnly(nextReadOnly);
        const url = process.env.NEXT_PUBLIC_REALTIME_URL;
        if (!url) return;
        const provider = new HocuspocusProvider({
          url,
          name: opts.diagramId,
          document: doc,
          token,
        });
        providerRef.current = provider;
        provider.on("unsyncedChanges", ({ number }: { number: number }) => setSaved(number === 0));
        provider.on("synced", () => setSaved(true));
        provider.awareness?.setLocalStateField("user", {
          name: opts.user.name ?? opts.user.email ?? "Anonymous",
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        });
        const onAwareness = () => {
          const users: PresenceUser[] = [];
          provider.awareness?.getStates().forEach((state, clientId) => {
            if (clientId === provider.awareness?.clientID) return;
            users.push({
              clientId,
              name: state.user?.name,
              color: state.user?.color ?? "#818cf8",
              cursor: state.user?.cursor,
            });
          });
          setPresence(users);
        };
        provider.awareness?.on("change", onAwareness);
      })
      .catch(() => {
        setSaved(true);
      });

    return () => {
      cancelled = true;
      getNodeMap(doc).unobserve(onYChange);
      getEdgeMap(doc).unobserve(onYChange);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      providerRef.current?.destroy();
      providerRef.current = null;
    };
  }, [hydrateFromDoc, opts.diagramId, opts.forceReadOnly, opts.user.email, opts.user.name]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((current) => {
        const next = applyNodeChanges(changes, current);
        const shouldPersist = changes.some((change) => {
          if (change.type === "remove") return true;
          if (change.type === "position" && change.dragging === false) return true;
          if (change.type === "dimensions" && "resizing" in change && change.resizing === false) return true;
          return false;
        });
        if (shouldPersist) {
          persistLocal(next, edgesRef.current);
        }
        return next;
      });
    },
    [persistLocal, readOnly, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      setEdges((current) => {
        const next = applyEdgeChanges(changes, current);
        const shouldPersist = changes.some((change) => change.type === "remove");
        if (shouldPersist) {
          persistLocal(nodesRef.current, next);
        }
        return next;
      });
    },
    [persistLocal, readOnly, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly || !connection.source || !connection.target) return;
      const edge: Edge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "labeled",
        animated: false,
        data: { animated: false },
      };
      setEdges((current) => {
        const next = [...current, edge];
        persistLocal(nodesRef.current, next);
        return next;
      });
    },
    [persistLocal, readOnly, setEdges],
  );

  const addNode = useCallback(
    (node: DiagramNode) => {
      if (readOnly) return;
      setNodes((current) => {
        const next = [...current, ...toFlowNodes([node])];
        persistLocal(next, edgesRef.current);
        return next;
      });
    },
    [persistLocal, readOnly, setNodes],
  );

  const updateNode = useCallback(
    (id: string, data: DiagramNode["data"]) => {
      if (readOnly) return;
      setNodes((current) => {
        const next = current.map((node) => (node.id === id ? { ...node, data } : node));
        persistLocal(next, edgesRef.current);
        return next;
      });
    },
    [persistLocal, readOnly, setNodes],
  );

  const updateEdge = useCallback(
    (id: string, patch: { label?: string; animated?: boolean }) => {
      if (readOnly) return;
      setEdges((current) => {
        const next = current.map((edge) => {
          if (edge.id !== id) return edge;
          const animated =
            patch.animated !== undefined
              ? patch.animated
              : Boolean((edge.data as { animated?: boolean } | undefined)?.animated ?? edge.animated);
          return {
            ...edge,
            label: patch.label !== undefined ? patch.label : edge.label,
            animated,
            data: { ...(typeof edge.data === "object" && edge.data ? edge.data : {}), animated },
          };
        });
        persistLocal(nodesRef.current, next);
        return next;
      });
    },
    [persistLocal, readOnly, setEdges],
  );

  const replaceSnapshot = useCallback(
    (snapshot: DiagramSnapshot) => {
      const nextNodes = toFlowNodes(snapshot.nodes);
      const nextEdges = toFlowEdges(snapshot.edges);
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      persistLocal(nextNodes, nextEdges);
    },
    [persistLocal],
  );

  const setCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorTimer.current < 40) return;
    cursorTimer.current = now;
    const awareness = providerRef.current?.awareness;
    if (!awareness) return;
    const current = awareness.getLocalState()?.user ?? {};
    awareness.setLocalStateField("user", { ...current, cursor: { x, y } });
  }, []);

  const selected = useMemo(() => nodes.find((node) => node.selected), [nodes]);
  const selectedEdge = useMemo(() => edges.find((edge) => edge.selected), [edges]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNode,
    updateEdge,
    replaceSnapshot,
    saved,
    presence,
    role,
    readOnly,
    selected,
    selectedEdge,
    setCursor,
    undo: () => undoRef.current?.undo(),
    redo: () => undoRef.current?.redo(),
    snapshot: () => ({
      nodes: flowNodesToDiagram(nodesRef.current),
      edges: flowEdgesToDiagram(edgesRef.current),
    }),
  };
}
