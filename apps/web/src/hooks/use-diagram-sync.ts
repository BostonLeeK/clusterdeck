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
  emptyMeta,
  getEdgeMap,
  getMetaMap,
  getNodeMap,
  snapshotFromDoc,
  type DiagramEdge,
  type DiagramFlow,
  type DiagramMeta,
  type DiagramNode,
  type DiagramSnapshot,
  type EdgeLineShape,
  type MemberRole,
  type TagDef,
} from "@dataflow/shared";
import { fromFlowNode, normalizeFlowInfraNode, toFlowEdges, toFlowNodes } from "@/lib/diagram";
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
    const data = edge.data as { animated?: boolean; lineShape?: EdgeLineShape } | undefined;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: typeof edge.label === "string" ? edge.label : undefined,
      animated: Boolean(data?.animated ?? edge.animated),
      lineShape: data?.lineShape ?? "bezier",
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
  const metaRef = useRef<DiagramMeta>(opts.initial.meta ?? emptyMeta());
  const [nodes, setNodesState] = useState<Node[]>(nodesRef.current);
  const [edges, setEdgesState] = useState<Edge[]>(edgesRef.current);
  const [meta, setMetaState] = useState<DiagramMeta>(metaRef.current);
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
    const nextMeta = snapshot.meta ?? emptyMeta();
    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    metaRef.current = nextMeta;
    setNodesState(nextNodes);
    setEdgesState(nextEdges);
    setMetaState(nextMeta);
  }, []);

  const persistLocal = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], nextMeta: DiagramMeta = metaRef.current) => {
      const doc = docRef.current;
      const snapshot: DiagramSnapshot = {
        nodes: flowNodesToDiagram(nextNodes),
        edges: flowEdgesToDiagram(nextEdges),
        meta: nextMeta,
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
    metaRef.current = initialRef.current.meta ?? emptyMeta();
    setMetaState(metaRef.current);
    undoRef.current = new Y.UndoManager([getNodeMap(doc), getEdgeMap(doc), getMetaMap(doc)]);

    const onYChange = (_event: unknown, transaction: Y.Transaction) => {
      if (transaction.origin === LOCAL_ORIGIN) return;
      hydrateFromDoc(doc);
    };
    getNodeMap(doc).observe(onYChange);
    getEdgeMap(doc).observe(onYChange);
    getMetaMap(doc).observe(onYChange);

    let cancelled = false;
    if (opts.forceReadOnly) {
      return () => {
        cancelled = true;
        getNodeMap(doc).unobserve(onYChange);
        getEdgeMap(doc).unobserve(onYChange);
        getMetaMap(doc).unobserve(onYChange);
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
        provider.on("synced", () => {
          setSaved(true);
          hydrateFromDoc(doc);
        });
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
      getMetaMap(doc).unobserve(onYChange);
      if (persistTimer.current) clearTimeout(persistTimer.current);
      providerRef.current?.destroy();
      providerRef.current = null;
    };
  }, [hydrateFromDoc, opts.diagramId, opts.forceReadOnly, opts.user.email, opts.user.name]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      setNodes((current) => {
        const next = (applyNodeChanges(changes, current) as Node[]).map((node) => {
          if (node.type !== "infra") return node;
          const dimensionChange = changes.find(
            (change) => change.type === "dimensions" && change.id === node.id,
          );
          if (!dimensionChange || dimensionChange.type !== "dimensions") return node;
          const width = dimensionChange.dimensions?.width ?? node.width;
          const height = dimensionChange.dimensions?.height ?? node.height;
          return normalizeFlowInfraNode({
            ...node,
            width: typeof width === "number" ? width : node.width,
            height: typeof height === "number" ? height : node.height,
          });
        });
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
        data: { animated: false, lineShape: "bezier" as EdgeLineShape },
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
    (id: string, patch: { label?: string; animated?: boolean; lineShape?: EdgeLineShape }) => {
      if (readOnly) return;
      setEdges((current) => {
        const next = current.map((edge) => {
          if (edge.id !== id) return edge;
          const data = (typeof edge.data === "object" && edge.data ? edge.data : {}) as {
            animated?: boolean;
            lineShape?: EdgeLineShape;
          };
          const animated =
            patch.animated !== undefined ? patch.animated : Boolean(data.animated ?? edge.animated);
          const lineShape = patch.lineShape !== undefined ? patch.lineShape : (data.lineShape ?? "bezier");
          return {
            ...edge,
            label: patch.label !== undefined ? patch.label : edge.label,
            animated,
            data: { ...data, animated, lineShape },
          };
        });
        persistLocal(nodesRef.current, next);
        return next;
      });
    },
    [persistLocal, readOnly, setEdges],
  );

  const updateMeta = useCallback(
    (next: DiagramMeta | ((current: DiagramMeta) => DiagramMeta)) => {
      if (readOnly) return;
      const resolved = typeof next === "function" ? next(metaRef.current) : next;
      metaRef.current = resolved;
      setMetaState(resolved);
      persistLocal(nodesRef.current, edgesRef.current, resolved);
    },
    [persistLocal, readOnly],
  );

  const upsertTagDef = useCallback(
    (label: string, color: string) => {
      updateMeta((current) => {
        const existing = current.tagDefs.find((item) => item.label === label);
        if (existing) {
          return {
            ...current,
            tagDefs: current.tagDefs.map((item) =>
              item.label === label ? { ...item, color } : item,
            ),
          };
        }
        const def: TagDef = { id: label, label, color };
        return { ...current, tagDefs: [...current.tagDefs, def] };
      });
    },
    [updateMeta],
  );

  const upsertFlow = useCallback(
    (flow: DiagramFlow) => {
      updateMeta((current) => {
        const index = current.flows.findIndex((item) => item.id === flow.id);
        if (index === -1) return { ...current, flows: [...current.flows, flow] };
        const flows = current.flows.slice();
        flows[index] = flow;
        return { ...current, flows };
      });
    },
    [updateMeta],
  );

  const removeFlow = useCallback(
    (id: string) => {
      updateMeta((current) => ({
        ...current,
        flows: current.flows.filter((item) => item.id !== id),
      }));
    },
    [updateMeta],
  );

  const toggleEdgeInFlow = useCallback(
    (flowId: string, edgeId: string) => {
      updateMeta((current) => ({
        ...current,
        flows: current.flows.map((flow) => {
          if (flow.id !== flowId) return flow;
          const has = flow.edgeIds.includes(edgeId);
          return {
            ...flow,
            edgeIds: has ? flow.edgeIds.filter((id) => id !== edgeId) : [...flow.edgeIds, edgeId],
          };
        }),
      }));
    },
    [updateMeta],
  );

  const replaceSnapshot = useCallback(
    (snapshot: DiagramSnapshot) => {
      const nextNodes = toFlowNodes(snapshot.nodes);
      const nextEdges = toFlowEdges(snapshot.edges);
      const nextMeta = snapshot.meta ?? emptyMeta();
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      metaRef.current = nextMeta;
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      setMetaState(nextMeta);
      persistLocal(nextNodes, nextEdges, nextMeta);
    },
    [persistLocal],
  );

  const commitNodes = useCallback(
    (next: Node[]) => {
      if (readOnly) return;
      nodesRef.current = next;
      setNodesState(next);
      persistLocal(next, edgesRef.current);
    },
    [persistLocal, readOnly],
  );

  const deleteNodes = useCallback(
    (ids: string[]) => {
      if (readOnly || !ids.length) return;
      const remove = new Set(ids);
      let grew = true;
      while (grew) {
        grew = false;
        for (const node of nodesRef.current) {
          if (node.parentId && remove.has(node.parentId) && !remove.has(node.id)) {
            remove.add(node.id);
            grew = true;
          }
        }
      }
      const nextNodes = nodesRef.current.filter((node) => !remove.has(node.id));
      const nextEdges = edgesRef.current.filter(
        (edge) => !remove.has(edge.source) && !remove.has(edge.target),
      );
      const removedEdgeIds = new Set(
        edgesRef.current.filter((edge) => remove.has(edge.source) || remove.has(edge.target)).map((e) => e.id),
      );
      let nextMeta = metaRef.current;
      if (removedEdgeIds.size) {
        nextMeta = {
          ...metaRef.current,
          flows: metaRef.current.flows.map((flow) => ({
            ...flow,
            edgeIds: flow.edgeIds.filter((id) => !removedEdgeIds.has(id)),
          })),
        };
        metaRef.current = nextMeta;
        setMetaState(nextMeta);
      }
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      persistLocal(nextNodes, nextEdges, nextMeta);
    },
    [persistLocal, readOnly],
  );

  const deleteEdges = useCallback(
    (ids: string[]) => {
      if (readOnly || !ids.length) return;
      const remove = new Set(ids);
      const nextEdges = edgesRef.current.filter((edge) => !remove.has(edge.id));
      const nextMeta: DiagramMeta = {
        ...metaRef.current,
        flows: metaRef.current.flows.map((flow) => ({
          ...flow,
          edgeIds: flow.edgeIds.filter((id) => !remove.has(id)),
        })),
      };
      edgesRef.current = nextEdges;
      metaRef.current = nextMeta;
      setEdgesState(nextEdges);
      setMetaState(nextMeta);
      persistLocal(nodesRef.current, nextEdges, nextMeta);
    },
    [persistLocal, readOnly],
  );

  const duplicateNodes = useCallback(
    (ids: string[]) => {
      if (readOnly || !ids.length) return;
      const selected = new Set(ids);
      const sourceNodes = nodesRef.current.filter((node) => selected.has(node.id));
      if (!sourceNodes.length) return;
      const idMap = new Map(sourceNodes.map((node) => [node.id, crypto.randomUUID()]));
      const clones = sourceNodes.map((node) => ({
        ...node,
        id: idMap.get(node.id)!,
        selected: true,
        parentId: node.parentId && idMap.has(node.parentId) ? idMap.get(node.parentId) : node.parentId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: structuredClone(node.data),
      }));
      const nextNodes = [
        ...nodesRef.current.map((node) => ({ ...node, selected: false })),
        ...clones,
      ];
      const nextEdges = [
        ...edgesRef.current.map((edge) => ({ ...edge, selected: false })),
        ...edgesRef.current
          .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
          .map((edge) => ({
            ...edge,
            id: crypto.randomUUID(),
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
            selected: false,
          })),
      ];
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      persistLocal(nextNodes, nextEdges);
    },
    [persistLocal, readOnly],
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
    meta,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNode,
    updateEdge,
    updateMeta,
    upsertTagDef,
    upsertFlow,
    removeFlow,
    toggleEdgeInFlow,
    replaceSnapshot,
    commitNodes,
    deleteNodes,
    deleteEdges,
    duplicateNodes,
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
      meta: metaRef.current,
    }),
  };
}
