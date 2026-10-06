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
  connectorHandleId,
  emptyMeta,
  getChatArray,
  parseConnectorHandle,
  snapshotFromDoc,
  type ChatMessage,
  type DiagramEdge,
  type DiagramFlow,
  type DiagramMeta,
  type DiagramNode,
  type DiagramSnapshot,
  type EdgeLineShape,
  type MemberRole,
  type NodeConnector,
  type TagDef,
} from "@dataflow/shared";
import { fromFlowNode, normalizeFlowInfraNode, toFlowEdges, toFlowNodes } from "@/lib/diagram";
import { resolveRealtimeUrl } from "@/lib/realtime-url";
import { recordHistory, redoHistory, restoreHistory, undoHistory } from "@/lib/history";
import { issueRealtimeToken, saveDiagramSnapshot } from "@/actions/diagrams";

export type PresenceUser = {
  clientId: number;
  userId?: string;
  name?: string;
  image?: string | null;
  color: string;
  cursor?: { x: number; y: number };
  isSelf?: boolean;
  guest?: boolean;
};

const COLORS = ["#818cf8", "#22d3ee", "#34d399", "#f472b6", "#fbbf24", "#fb7185", "#a78bfa"];
const LOCAL_ORIGIN = "local";
const MAX_CHAT = 200;

function colorFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length]!;
}

function flowNodesToDiagram(nodes: Node[]): DiagramNode[] {
  return nodes.map((node) =>
    fromFlowNode({
      ...node,
      data: node.data as DiagramNode["data"],
    }),
  );
}

function remapConnectors(data: Node["data"], idMap: Map<string, string>): Node["data"] {
  const connectors = (data as { connectors?: NodeConnector[] }).connectors;
  if (!connectors?.length) return data;
  return {
    ...data,
    connectors: connectors.map((item) => ({ ...item, nodeId: idMap.get(item.nodeId) ?? item.nodeId })),
  };
}

function remapHandle(handle: string | null | undefined, idMap: Map<string, string>) {
  const parsed = parseConnectorHandle(handle);
  if (!parsed) return handle;
  const nodeId = idMap.get(parsed.nodeId);
  return nodeId ? connectorHandleId(parsed.direction, nodeId) : handle;
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
  user: { id?: string | null; name?: string | null; email?: string | null; image?: string | null };
  forceReadOnly?: boolean;
  shareToken?: string;
}) {
  const docRef = useRef<Y.Doc>(new Y.Doc());
  const nodesRef = useRef<Node[]>(toFlowNodes(opts.initial.nodes));
  const edgesRef = useRef<Edge[]>(toFlowEdges(opts.initial.edges));
  const metaRef = useRef<DiagramMeta>(opts.initial.meta ?? emptyMeta());
  const [nodes, setNodesState] = useState<Node[]>(nodesRef.current);
  const [edges, setEdgesState] = useState<Edge[]>(edgesRef.current);
  const [meta, setMetaState] = useState<DiagramMeta>(metaRef.current);
  const [saved, setSaved] = useState(true);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [mcpActive, setMcpActive] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [role, setRole] = useState<MemberRole | "public">(opts.forceReadOnly ? "viewer" : "editor");
  const [readOnly, setReadOnly] = useState(Boolean(opts.forceReadOnly));
  const initialRef = useRef(opts.initial);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const cursorTimer = useRef(0);
  const userRef = useRef(opts.user);
  userRef.current = opts.user;

  useEffect(() => {
    const awareness = providerRef.current?.awareness;
    if (!awareness) return;
    const user = userRef.current;
    const seed = user.id || user.email || user.name || "anon";
    const current = awareness.getLocalState()?.user ?? {};
    awareness.setLocalStateField("user", {
      ...current,
      userId: user.id ?? undefined,
      name: user.name ?? user.email ?? "Anonymous",
      image: user.image ?? null,
      color: current.color ?? colorFor(seed),
      guest: !user.id || String(user.id).startsWith("guest:"),
    });
  }, [opts.user.email, opts.user.id, opts.user.image, opts.user.name]);

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

  const writeSnapshot = useCallback(
    (snapshot: DiagramSnapshot, record: boolean) => {
      dirtyRef.current = true;
      const doc = docRef.current;
      if (record) recordHistory(opts.diagramId, snapshotFromDoc(doc), snapshot);
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

  const persistLocal = useCallback(
    (nextNodes: Node[], nextEdges: Edge[], nextMeta: DiagramMeta = metaRef.current) => {
      writeSnapshot(
        {
          nodes: flowNodesToDiagram(nextNodes),
          edges: flowEdgesToDiagram(nextEdges),
          meta: nextMeta,
        },
        true,
      );
    },
    [writeSnapshot],
  );

  const showSnapshot = useCallback(
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
      writeSnapshot(snapshot, false);
    },
    [writeSnapshot],
  );

  useEffect(() => {
    const doc = docRef.current;
    applySnapshot(doc, initialRef.current, "init");
    metaRef.current = initialRef.current.meta ?? emptyMeta();
    setMetaState(metaRef.current);
    setChat(getChatArray(doc).toArray());

    const hydrateRemote = (_update: Uint8Array, origin: unknown) => {
      if (origin === LOCAL_ORIGIN || origin === "init") return;
      hydrateFromDoc(doc);
    };
    doc.on("update", hydrateRemote);

    const refreshChat = () => setChat(getChatArray(doc).toArray());
    getChatArray(doc).observe(refreshChat);

    let cancelled = false;
    let mcpTimer: ReturnType<typeof setTimeout> | null = null;

    void issueRealtimeToken(opts.diagramId, opts.shareToken)
      .then(({ token, role: nextRole, readOnly: nextReadOnly }) => {
        if (cancelled) return;
        setRole(nextRole);
        setReadOnly(nextReadOnly || Boolean(opts.forceReadOnly));
        const url = resolveRealtimeUrl();
        if (!url) return;

        const provider = new HocuspocusProvider({
          url,
          name: opts.diagramId,
          document: doc,
          token,
        });
        providerRef.current = provider;

        const publishLocalUser = () => {
          const user = userRef.current;
          const seed = user.id || user.email || user.name || "anon";
          const guest = !user.id || String(user.id).startsWith("guest:");
          provider.awareness?.setLocalStateField("user", {
            userId: user.id ?? undefined,
            name: user.name ?? user.email ?? "Anonymous",
            image: user.image ?? null,
            color: colorFor(seed),
            guest,
            cursor: provider.awareness?.getLocalState()?.user?.cursor,
          });
        };

        const onAwareness = () => {
          const users: PresenceUser[] = [];
          const localId = provider.awareness?.clientID;
          provider.awareness?.getStates().forEach((state, clientId) => {
            if (!state.user) return;
            users.push({
              clientId,
              userId: state.user.userId,
              name: state.user.name,
              image: state.user.image,
              color: state.user.color ?? "#818cf8",
              cursor: state.user.cursor,
              isSelf: clientId === localId,
              guest: Boolean(state.user.guest) || String(state.user.userId ?? "").startsWith("guest:"),
            });
          });
          users.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
          setPresence(users);
        };

        provider.on("unsyncedChanges", ({ number }: { number: number }) => {
          if (opts.forceReadOnly) return;
          setSaved(number === 0);
        });
        provider.on("synced", () => {
          setSaved(true);
          setConnected(true);
          hydrateFromDoc(doc);
          refreshChat();
          publishLocalUser();
          onAwareness();
        });
        provider.on("status", ({ status }: { status: string }) => {
          setConnected(status === "connected");
          if (status === "connected") {
            publishLocalUser();
            onAwareness();
          }
        });
        provider.on("awarenessUpdate", onAwareness);
        provider.awareness?.on("change", onAwareness);
        provider.on("stateless", ({ payload }: { payload: string }) => {
          try {
            const message = JSON.parse(payload) as { type?: string; active?: boolean };
            if (message.type !== "mcp") return;
            if (mcpTimer) clearTimeout(mcpTimer);
            if (!message.active) {
              setMcpActive(false);
              return;
            }
            setMcpActive(true);
            mcpTimer = setTimeout(() => setMcpActive(false), 25000);
          } catch {
            return;
          }
        });
        publishLocalUser();
        onAwareness();
      })
      .catch(() => {
        setSaved(true);
        setConnected(false);
      });

    return () => {
      cancelled = true;
      doc.off("update", hydrateRemote);
      getChatArray(doc).unobserve(refreshChat);
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      if (mcpTimer) clearTimeout(mcpTimer);
      setMcpActive(false);
      const provider = providerRef.current;
      if (!provider && dirtyRef.current) {
        void saveDiagramSnapshot(opts.diagramId, snapshotFromDoc(doc)).catch(() => undefined);
      }
      provider?.destroy();
      providerRef.current = null;
      dirtyRef.current = false;
      setConnected(false);
      setPresence([]);
    };
  }, [hydrateFromDoc, opts.diagramId, opts.forceReadOnly, opts.shareToken]);

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

  const setNodeConnectors = useCallback(
    (id: string, connectors: NodeConnector[]) => {
      if (readOnly) return;
      const valid = new Set(connectors.map((item) => connectorHandleId(item.direction, item.nodeId)));
      const nextNodes = nodesRef.current.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, connectors } } : node,
      );
      const nextEdges = edgesRef.current.map((edge) => {
        const staleSource = edge.source === id && edge.sourceHandle && !valid.has(edge.sourceHandle);
        const staleTarget = edge.target === id && edge.targetHandle && !valid.has(edge.targetHandle);
        if (!staleSource && !staleTarget) return edge;
        return {
          ...edge,
          sourceHandle: staleSource ? null : edge.sourceHandle,
          targetHandle: staleTarget ? null : edge.targetHandle,
        };
      });
      nodesRef.current = nextNodes;
      edgesRef.current = nextEdges;
      setNodesState(nextNodes);
      setEdgesState(nextEdges);
      persistLocal(nextNodes, nextEdges);
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

  const pasteGraph = useCallback(
    (
      sourceNodes: Array<{
        id: string;
        type?: string | null;
        position: { x: number; y: number };
        parentId?: string;
        width?: number;
        height?: number;
        data: Node["data"];
      }>,
      sourceEdges: Array<{
        source: string;
        target: string;
        sourceHandle?: string | null;
        targetHandle?: string | null;
        label?: unknown;
        data?: Edge["data"];
      }>,
      offset: { x: number; y: number },
    ) => {
      if (readOnly || !sourceNodes.length) return;
      const idMap = new Map(sourceNodes.map((node) => [node.id, crypto.randomUUID()]));
      const existing = new Set(nodesRef.current.map((node) => node.id));
      const clones = sourceNodes.map((node) => {
        const parentCopied = Boolean(node.parentId && idMap.has(node.parentId));
        const parentKept = Boolean(node.parentId && !parentCopied && existing.has(node.parentId));
        return {
          id: idMap.get(node.id)!,
          type: node.type ?? "infra",
          selected: true,
          parentId: parentCopied ? idMap.get(node.parentId!) : parentKept ? node.parentId : undefined,
          extent: parentCopied || parentKept ? ("parent" as const) : undefined,
          position: parentCopied
            ? { ...node.position }
            : { x: node.position.x + offset.x, y: node.position.y + offset.y },
          width: node.width,
          height: node.height,
          data: remapConnectors(structuredClone(node.data), idMap),
        };
      });
      const ordered = [...clones].sort((left, right) => {
        const depth = (id: string) => {
          let value = 0;
          let parentId = clones.find((node) => node.id === id)?.parentId;
          const seen = new Set<string>();
          while (parentId && !seen.has(parentId)) {
            seen.add(parentId);
            value += 1;
            parentId = clones.find((node) => node.id === parentId)?.parentId;
          }
          return value;
        };
        return depth(left.id) - depth(right.id);
      });
      const nextNodes = [...nodesRef.current.map((node) => ({ ...node, selected: false })), ...ordered];
      const nextEdges = [
        ...edgesRef.current.map((edge) => ({ ...edge, selected: false })),
        ...sourceEdges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => ({
            id: crypto.randomUUID(),
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
            sourceHandle: remapHandle(edge.sourceHandle, idMap),
            targetHandle: remapHandle(edge.targetHandle, idMap),
            label: typeof edge.label === "string" ? edge.label : undefined,
            selected: false,
            data: edge.data ? structuredClone(edge.data) : undefined,
            type: "labeled" as const,
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
        data: remapConnectors(structuredClone(node.data), idMap),
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
            sourceHandle: remapHandle(edge.sourceHandle, idMap),
            targetHandle: remapHandle(edge.targetHandle, idMap),
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
    const user = userRef.current;
    const seed = user.id || user.email || user.name || "anon";
    const current = awareness.getLocalState()?.user ?? {};
    awareness.setLocalStateField("user", {
      ...current,
      userId: user.id ?? current.userId,
      name: user.name ?? user.email ?? current.name ?? "Anonymous",
      image: user.image ?? current.image ?? null,
      color: current.color ?? colorFor(seed),
      guest: !user.id || String(user.id).startsWith("guest:"),
      cursor: { x, y },
    });
  }, []);

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const user = userRef.current;
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId: user.id ?? user.email ?? "anon",
      name: user.name ?? user.email ?? "Anonymous",
      image: user.image ?? null,
      text: trimmed.slice(0, 1000),
      at: Date.now(),
    };
    const chatArr = getChatArray(docRef.current);
    docRef.current.transact(() => {
      chatArr.push([message]);
      while (chatArr.length > MAX_CHAT) chatArr.delete(0, 1);
    });
  }, []);

  const undo = useCallback(() => {
    if (readOnly) return;
    const snapshot = undoHistory(opts.diagramId);
    if (snapshot) showSnapshot(snapshot);
  }, [opts.diagramId, readOnly, showSnapshot]);

  const redo = useCallback(() => {
    if (readOnly) return;
    const snapshot = redoHistory(opts.diagramId);
    if (snapshot) showSnapshot(snapshot);
  }, [opts.diagramId, readOnly, showSnapshot]);

  const restore = useCallback(
    (entryId: string) => {
      if (readOnly) return;
      const snapshot = restoreHistory(opts.diagramId, entryId, snapshotFromDoc(docRef.current));
      if (snapshot) showSnapshot(snapshot);
    },
    [opts.diagramId, readOnly, showSnapshot],
  );

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
    setNodeConnectors,
    deleteNodes,
    deleteEdges,
    duplicateNodes,
    pasteGraph,
    saved,
    connected,
    mcpActive,
    presence,
    chat,
    sendChat,
    role,
    readOnly,
    selected,
    selectedEdge,
    setCursor,
    undo,
    redo,
    restore,
    flushPersistence: () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      const provider = providerRef.current;
      if (!provider) {
        if (!dirtyRef.current) return Promise.resolve();
        return saveDiagramSnapshot(opts.diagramId, snapshotFromDoc(docRef.current)).then(() => {
          dirtyRef.current = false;
          setSaved(true);
        });
      }
      if (!provider.hasUnsyncedChanges) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          provider.off("unsyncedChanges", onUnsynced);
          resolve();
        };
        const onUnsynced = ({ number }: { number: number }) => {
          if (number === 0) finish();
        };
        const timer = setTimeout(finish, 1500);
        provider.on("unsyncedChanges", onUnsynced);
      });
    },
    snapshot: () => ({
      nodes: flowNodesToDiagram(nodesRef.current),
      edges: flowEdgesToDiagram(edgesRef.current),
      meta: metaRef.current,
    }),
  };
}
