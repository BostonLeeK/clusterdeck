"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  ViewportPortal,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import {
  ArrowLeft,
  Hand,
  MessageSquare,
  Minus,
  MousePointer2,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import type { DiagramSnapshot, InfraNodeData, InfraNodeTypeId, MemberRole, TagDef } from "@dataflow/shared";
import { ACCENT_SWATCHES, createInfraNodeData, hashTagColor } from "@dataflow/shared";
import { openOrCreateInnerDiagram } from "@/actions/diagrams";
import { Logo } from "@/components/logo";
import { ExportMenu } from "@/components/editor/export-menu";
import { LabeledEdge } from "@/components/editor/labeled-edge";
import { GroupNode, InfraNode, NoteNode, PortNode } from "@/components/editor/nodes";
import { EdgeDetails } from "@/components/editor/edge-details";
import { NodeDetails } from "@/components/editor/node-details";
import { NodeLibrary } from "@/components/editor/node-library";
import { Outline } from "@/components/editor/outline";
import { ShareDialog } from "@/components/editor/share-dialog";
import {
  DiagramPerspectiveProvider,
  type TagPerspectiveMode,
} from "@/components/editor/diagram-perspective";
import { PerspectiveBar } from "@/components/editor/perspective-bar";
import {
  CanvasContextMenu,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  type CanvasMenuState,
} from "@/components/editor/canvas-context-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useDiagramSync } from "@/hooks/use-diagram-sync";
import { attachNodeToGroup, groupSelectedNodes, ungroupNode } from "@/lib/diagram";

const nodeTypes = { infra: InfraNode, group: GroupNode, port: PortNode, note: NoteNode };
const edgeTypes = { labeled: LabeledEdge };

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: MemberRole;
};

export function EditorApp(props: {
  projectId: string;
  diagramId: string;
  projectName: string;
  shareToken: string;
  linkAccess: "none" | "view";
  members: Member[];
  trail: { id: string; name: string }[];
  snapshot: DiagramSnapshot;
  user: { id?: string | null; name?: string | null; email?: string | null; image?: string | null };
  insideLabel?: string;
  forceReadOnly?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}

function EditorCanvas(props: Parameters<typeof EditorApp>[0]) {
  const router = useRouter();
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, getZoom, getIntersectingNodes } = useReactFlow();
  const isPublic = Boolean(props.forceReadOnly);
  const [tool, setTool] = useState<"select" | "pan">(isPublic ? "pan" : "select");
  const [zoom, setZoom] = useState(1);
  const [menu, setMenu] = useState<CanvasMenuState | null>(null);
  const [leftOpen, setLeftOpen] = useState(!isPublic);
  const [rightOpen, setRightOpen] = useState(!isPublic);
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [pinnedTag, setPinnedTag] = useState<string | null>(null);
  const [tagMode, setTagMode] = useState<TagPerspectiveMode>("highlight");
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const sync = useDiagramSync({
    diagramId: props.diagramId,
    initial: props.snapshot,
    user: props.user,
    forceReadOnly: props.forceReadOnly,
  });

  const selected = sync.selected as Node | undefined;
  const selectedEdge = sync.selectedEdge;
  const activeFlow = useMemo(
    () => sync.meta.flows.find((flow) => flow.id === activeFlowId) ?? null,
    [activeFlowId, sync.meta.flows],
  );
  const flowEdgeIds = useMemo(() => new Set(activeFlow?.edgeIds ?? []), [activeFlow]);
  const flowNodeIds = useMemo(() => {
    const ids = new Set<string>();
    if (!activeFlow) return ids;
    for (const edge of sync.edges) {
      if (!flowEdgeIds.has(edge.id)) continue;
      ids.add(edge.source);
      ids.add(edge.target);
    }
    return ids;
  }, [activeFlow, flowEdgeIds, sync.edges]);
  const tagDefs = useMemo(() => {
    const map = new Map<string, TagDef>();
    for (const def of sync.meta.tagDefs) map.set(def.label, def);
    for (const node of sync.nodes) {
      const data = node.data as InfraNodeData;
      if (data.kind !== "infra") continue;
      for (const tag of data.tags) {
        if (!map.has(tag)) map.set(tag, { id: tag, label: tag, color: hashTagColor(tag) });
      }
    }
    return Array.from(map.values());
  }, [sync.meta.tagDefs, sync.nodes]);
  const perspectiveValue = useMemo(
    () => ({
      tagDefs,
      hoveredTag,
      pinnedTag,
      tagMode,
      activeFlowId,
      activeFlow,
      flows: sync.meta.flows,
      flowNodeIds,
      flowEdgeIds,
    }),
    [activeFlow, activeFlowId, flowEdgeIds, flowNodeIds, hoveredTag, pinnedTag, sync.meta.flows, tagDefs, tagMode],
  );
  const connections = useMemo(() => {
    if (!selected) return { incoming: [], outgoing: [] };
    const titleOf = (id: string) => {
      const node = sync.nodes.find((item) => item.id === id);
      const data = node?.data as { title?: string } | undefined;
      return data?.title ?? id;
    };
    return {
      incoming: sync.edges
        .filter((edge) => edge.target === selected.id)
        .map((edge) => ({
          id: edge.source,
          title: titleOf(edge.source),
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
      outgoing: sync.edges
        .filter((edge) => edge.source === selected.id)
        .map((edge) => ({
          id: edge.target,
          title: titleOf(edge.target),
          label: typeof edge.label === "string" ? edge.label : undefined,
        })),
    };
  }, [selected, sync.edges, sync.nodes]);

  const setNodes = sync.setNodes;
  const setEdges = sync.setEdges;

  const selectNodeOnly = useCallback(
    (nodeId: string, focus = false) => {
      setNodes((current) => current.map((node) => ({ ...node, selected: node.id === nodeId })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
      if (!focus) return;
      void fitView({ nodes: [{ id: nodeId }], padding: 0.45, duration: 220, maxZoom: Math.max(getZoom(), 1) });
    },
    [fitView, getZoom, setEdges, setNodes],
  );

  const selectEdgeOnly = useCallback(
    (edgeId: string) => {
      setEdges((current) => current.map((edge) => ({ ...edge, selected: edge.id === edgeId })));
      setNodes((current) => current.map((node) => ({ ...node, selected: false })));
    },
    [setEdges, setNodes],
  );

  const addNode = sync.addNode;
  const createNode = useCallback(
    (typeId: InfraNodeTypeId, position = { x: 180, y: 180 }) => {
      addNode({
        id: crypto.randomUUID(),
        type: "infra",
        position,
        data: createInfraNodeData(typeId),
      });
    },
    [addNode],
  );

  const createFlow = useCallback(
    (edgeIds: string[] = []) => {
      const color = ACCENT_SWATCHES[sync.meta.flows.length % ACCENT_SWATCHES.length]!;
      const flow = {
        id: crypto.randomUUID(),
        name: `Flow ${sync.meta.flows.length + 1}`,
        color,
        edgeIds,
      };
      sync.upsertFlow(flow);
      setActiveFlowId(flow.id);
      return flow;
    },
    [sync],
  );

  const addNote = useCallback(
    (tone: "text" | "comment", position?: { x: number; y: number }) => {
      if (sync.readOnly) return;
      const nextPosition =
        position ??
        screenToFlowPosition({
          x:
            (wrapper.current?.getBoundingClientRect().width ?? 400) / 2 +
            (wrapper.current?.getBoundingClientRect().left ?? 0),
          y:
            (wrapper.current?.getBoundingClientRect().height ?? 300) / 2 +
            (wrapper.current?.getBoundingClientRect().top ?? 0),
        });
      addNode({
        id: crypto.randomUUID(),
        type: "note",
        position: nextPosition,
        data: {
          kind: "note",
          title: tone === "comment" ? "Comment" : "Text",
          body: "",
          tone,
        },
      });
    },
    [addNode, screenToFlowPosition, sync.readOnly],
  );

  const groupSelection = useCallback(() => {
    if (sync.readOnly) return;
    const selectedNodes = sync.nodes.filter((node) => node.selected);
    if (selectedNodes.length === 1 && selectedNodes[0]?.type === "group") {
      sync.commitNodes(ungroupNode(sync.nodes, selectedNodes[0].id));
      return;
    }
    const grouped = groupSelectedNodes(sync.nodes);
    if (grouped) {
      sync.commitNodes(grouped);
      return;
    }
    addNode({
      id: crypto.randomUUID(),
      type: "group",
      position: { x: 120, y: 120 },
      width: 520,
      height: 280,
      data: { kind: "group", title: "Subworkflow", tags: [], childCount: 0 },
    });
  }, [addNode, sync]);

  const ungroupSelection = useCallback(() => {
    if (sync.readOnly) return;
    const group = sync.nodes.find((node) => node.selected && node.type === "group");
    if (!group) return;
    sync.commitNodes(ungroupNode(sync.nodes, group.id));
  }, [sync]);

  const openInner = useCallback(
    async (nodeId?: string) => {
      const id = nodeId ?? selected?.id;
      const node = sync.nodes.find((item) => item.id === id);
      if (!node || node.type !== "infra") return;
      const result = await openOrCreateInnerDiagram(props.diagramId, node.id);
      router.push(`/editor/${props.projectId}/${result.diagramId}`);
    },
    [props.diagramId, props.projectId, router, selected?.id, sync.nodes],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const deleteSelection = useCallback(() => {
    if (sync.readOnly) return;
    const nodeIds = sync.nodes.filter((node) => node.selected).map((node) => node.id);
    const edgeIds = sync.edges.filter((edge) => edge.selected).map((edge) => edge.id);
    if (nodeIds.length) sync.deleteNodes(nodeIds);
    if (edgeIds.length) sync.deleteEdges(edgeIds);
  }, [sync]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "g") return;
      event.preventDefault();
      if (event.shiftKey) ungroupSelection();
      else groupSelection();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection, groupSelection, ungroupSelection]);

  const onPaneMouseMove = useCallback(
    (event: MouseEvent) => {
      const bounds = wrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      sync.setCursor(position.x, position.y);
    },
    [screenToFlowPosition, sync.setCursor],
  );

  return (
    <div className="flex h-screen flex-col bg-[#0b0b0d]">
      <header className="flex h-12 items-center justify-between border-b border-[#1e1e22] px-4">
        <div className="flex min-w-0 items-center gap-1 text-[13px] text-zinc-500">
          <Link
            href={isPublic ? "/sign-in" : "/projects"}
            title={isPublic ? "Sign in" : "All projects"}
            className="mr-1 shrink-0 rounded-lg p-0.5 hover:bg-white/5"
          >
            <Logo showName={false} className="gap-0" />
          </Link>
          {!isPublic ? (
            <button
              type="button"
              title={props.trail.length > 1 ? "Up one level" : "Back to projects"}
              className="mr-1 grid size-7 shrink-0 place-items-center rounded-lg hover:bg-white/5"
              onClick={() => {
                if (props.trail.length > 1) {
                  const parent = props.trail[props.trail.length - 2];
                  if (parent) router.push(`/editor/${props.projectId}/${parent.id}`);
                  return;
                }
                router.push("/projects");
              }}
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : null}
          <span className="shrink-0 truncate text-zinc-200">{props.projectName}</span>
          {!isPublic
            ? props.trail.slice(1).map((item, index, items) => (
                <span key={item.id} className="flex min-w-0 items-center">
                  <span className="mx-1.5 shrink-0 text-zinc-600">›</span>
                  <button
                    type="button"
                    className={`truncate ${index === items.length - 1 ? "text-white" : "hover:text-zinc-300"}`}
                    onClick={() => router.push(`/editor/${props.projectId}/${item.id}`)}
                  >
                    {item.name}
                  </button>
                </span>
              ))
            : null}
          {isPublic ? <span className="ml-2 shrink-0 text-xs text-zinc-500">View only</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Button asChild size="sm" className="h-8 rounded-lg">
              <Link href="/sign-in">Sign in to edit</Link>
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-2 pr-1">
                {sync.presence.length ? (
                  <div className="flex -space-x-1.5">
                    {sync.presence.map((user) => (
                      <span key={user.clientId} title={user.name ?? "Collaborator"} className="relative">
                        <Avatar
                          name={user.name}
                          image={user.image}
                          className="size-6 ring-2 ring-[#0b0b0d]"
                        />
                        <span
                          className="absolute right-0 bottom-0 size-1.5 rounded-full ring-1 ring-[#0b0b0d]"
                          style={{ background: user.color }}
                        />
                      </span>
                    ))}
                  </div>
                ) : null}
                <span
                  className={`size-1.5 rounded-full ${sync.connected ? "bg-emerald-400" : "bg-zinc-600"}`}
                  title={sync.connected ? "Realtime connected" : "Connecting…"}
                />
              </div>
              <ShareDialog
                projectId={props.projectId}
                shareToken={props.shareToken}
                linkAccess={props.linkAccess}
                members={props.members}
              />
              <ExportMenu diagramId={props.diagramId} getSnapshot={sync.snapshot} onImport={sync.replaceSnapshot} />
              <button className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5" onClick={sync.undo}>
                <Undo2 className="size-4" />
              </button>
              <button className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5" onClick={sync.redo}>
                <Redo2 className="size-4" />
              </button>
            </>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {!isPublic && leftOpen ? (
          <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#1e1e22] bg-[#0b0b0d]">
            <NodeLibrary onAdd={(typeId) => createNode(typeId)} onCollapse={() => setLeftOpen(false)} />
            <Outline
              nodes={sync.nodes}
              selectedId={selected?.id}
              onSelect={(id) => {
                setRightOpen(true);
                selectNodeOnly(id, true);
              }}
            />
          </aside>
        ) : null}
        <div className="relative min-w-0 flex-1" ref={wrapper}>
          {!isPublic && !leftOpen ? (
            <button
              type="button"
              title="Open left panel"
              className="absolute top-3 left-14 z-10 grid size-9 place-items-center rounded-xl border border-[#2a2a2e] bg-[#141416]/95 text-zinc-400 hover:bg-white/5 hover:text-white"
              onClick={() => setLeftOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
            </button>
          ) : null}
          {!isPublic && !rightOpen ? (
            <button
              type="button"
              title="Open right panel"
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-xl border border-[#2a2a2e] bg-[#141416]/95 text-zinc-400 hover:bg-white/5 hover:text-white"
              onClick={() => setRightOpen(true)}
            >
              <PanelRightOpen className="size-4" />
            </button>
          ) : null}
          {!isPublic ? (
            <div className="absolute top-3 left-3 z-10 flex flex-col gap-0.5 rounded-2xl border border-[#2a2a2e] bg-[#141416]/95 p-1">
              <Tool active={tool === "select"} icon={<MousePointer2 className="size-4" />} onClick={() => setTool("select")} />
              <Tool active={tool === "pan"} icon={<Hand className="size-4" />} onClick={() => setTool("pan")} />
              <Tool icon={<Plus className="size-4" />} onClick={() => createNode("service")} />
              <Tool icon={<Square className="size-4" />} onClick={groupSelection} />
              <Tool icon={<Type className="size-4" />} onClick={() => addNote("text")} />
              <Tool icon={<MessageSquare className="size-4" />} onClick={() => addNote("comment")} />
            </div>
          ) : null}
          {props.insideLabel && !isPublic ? (
            <div className="absolute top-3 left-16 z-10 inline-flex items-center gap-2 rounded-full border border-[#2a2a2e] bg-[#141416] px-3 py-1 text-xs text-zinc-300">
              Inside: {props.insideLabel}
            </div>
          ) : null}
          <DiagramPerspectiveProvider value={perspectiveValue}>
            <ReactFlow
              nodes={sync.nodes}
              edges={sync.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={sync.onNodesChange}
              onEdgesChange={sync.onEdgesChange}
              onConnect={sync.onConnect}
              onNodeClick={(event, node) => {
                if (isPublic) return;
                setMenu(null);
                setRightOpen(true);
                if (event.shiftKey) {
                  setNodes((current) =>
                    current.map((item) => (item.id === node.id ? { ...item, selected: !item.selected } : item)),
                  );
                  setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
                  return;
                }
                selectNodeOnly(node.id);
              }}
              onNodeDragStop={(_, node) => {
                if (sync.readOnly || node.type === "group") return;
                const hits = getIntersectingNodes(node).filter(
                  (item) => item.type === "group" && item.id !== node.id,
                );
                const target = hits.sort((a, b) => {
                  const aArea = (a.width ?? 1) * (a.height ?? 1);
                  const bArea = (b.width ?? 1) * (b.height ?? 1);
                  return aArea - bArea;
                })[0];
                if (target && target.id !== node.parentId) {
                  sync.commitNodes(attachNodeToGroup(sync.nodes, node.id, target.id));
                  return;
                }
                if (node.parentId && !hits.some((item) => item.id === node.parentId)) {
                  sync.commitNodes(attachNodeToGroup(sync.nodes, node.id, null));
                }
              }}
              onEdgeClick={(_, edge) => {
                if (isPublic) return;
                setMenu(null);
                setRightOpen(true);
                selectEdgeOnly(edge.id);
              }}
              onPaneClick={() => {
                setMenu(null);
                setNodes((current) => current.map((node) => ({ ...node, selected: false })));
                setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
              }}
              onPaneContextMenu={(event) => {
                if (isPublic || sync.readOnly) return;
                event.preventDefault();
                setMenu({
                  kind: "pane",
                  clientX: event.clientX,
                  clientY: event.clientY,
                  flow: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
                });
              }}
              onNodeContextMenu={(event, node) => {
                if (isPublic || sync.readOnly) return;
                event.preventDefault();
                if (!node.selected) selectNodeOnly(node.id);
                setMenu({
                  kind: "node",
                  clientX: event.clientX,
                  clientY: event.clientY,
                  nodeId: node.id,
                  nodeType: node.type,
                });
              }}
              onEdgeContextMenu={(event, edge) => {
                if (isPublic || sync.readOnly) return;
                event.preventDefault();
                selectEdgeOnly(edge.id);
                setMenu({
                  kind: "edge",
                  clientX: event.clientX,
                  clientY: event.clientY,
                  edgeId: edge.id,
                });
              }}
              onPaneMouseMove={onPaneMouseMove}
              onDrop={(event) => {
                if (isPublic) return;
                event.preventDefault();
                const typeId = event.dataTransfer.getData("application/dataflow-node") as InfraNodeTypeId;
                if (!typeId) return;
                createNode(typeId, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
              }}
              onDragOver={(event) => {
                if (isPublic) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onNodeDoubleClick={(_, node) => {
                if (isPublic) return;
                if (node.type === "infra") void openInner();
              }}
              fitView
              minZoom={0.01}
              maxZoom={4}
              panOnDrag={isPublic || tool === "pan" ? true : [1]}
              selectionOnDrag={!isPublic && tool === "select"}
              selectNodesOnDrag={false}
              selectionKeyCode={isPublic ? null : "Shift"}
              multiSelectionKeyCode={isPublic ? null : "Shift"}
              nodesDraggable={!sync.readOnly && !isPublic && tool === "select"}
              nodesConnectable={!sync.readOnly && !isPublic}
              elementsSelectable={!isPublic && tool === "select"}
              onMoveEnd={() => setZoom(getZoom())}
              onInit={(instance) => setZoom(instance.getZoom())}
              proOptions={{ hideAttribution: true }}
              className="bg-[#0b0b0d]"
              defaultEdgeOptions={{ type: "labeled", style: { stroke: "#52525b", strokeWidth: 1.4 } }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.1} color="#2a2a2e" />
              <MiniMap
                pannable
                zoomable
                position="bottom-right"
                style={{ marginRight: 12, marginBottom: 48 }}
                maskColor="rgba(0, 0, 0, 0.6)"
                nodeStrokeColor="#3f3f46"
                nodeColor="#27272a"
                nodeStrokeWidth={1}
              />
              {!isPublic
                ? sync.presence.map((user) =>
                    user.cursor ? (
                      <ViewportPortal key={user.clientId}>
                        <div
                          className="pointer-events-none absolute z-50"
                          style={{
                            transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
                          }}
                        >
                          <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="-ml-0.5 -mt-0.5">
                            <path
                              d="M1 1L1 15.5L5.2 11.8L8.2 18.2L10.4 17.2L7.3 10.6L12.5 10.6L1 1Z"
                              fill={user.color}
                              stroke="#0b0b0d"
                              strokeWidth="1"
                            />
                          </svg>
                          <div
                            className="mt-0.5 ml-3 flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5 shadow-lg"
                            style={{ background: user.color }}
                          >
                            <Avatar name={user.name} image={user.image} className="size-4 ring-1 ring-black/20" />
                            <span className="max-w-28 truncate text-[10px] font-semibold text-zinc-950">
                              {user.name ?? "User"}
                            </span>
                          </div>
                        </div>
                      </ViewportPortal>
                    ) : null,
                  )
                : null}
            </ReactFlow>
          </DiagramPerspectiveProvider>
          {!isPublic ? (
            <PerspectiveBar
              tagDefs={tagDefs}
              flows={sync.meta.flows}
              chat={sync.chat}
              hoveredTag={hoveredTag}
              pinnedTag={pinnedTag}
              tagMode={tagMode}
              activeFlowId={activeFlowId}
              readOnly={sync.readOnly}
              onHoverTag={setHoveredTag}
              onPinTag={setPinnedTag}
              onTagMode={setTagMode}
              onActiveFlow={setActiveFlowId}
              onCreateFlow={() => createFlow([])}
              onRemoveFlow={(id) => {
                sync.removeFlow(id);
                if (activeFlowId === id) setActiveFlowId(null);
              }}
              onRenameFlow={(id, name) => {
                const flow = sync.meta.flows.find((item) => item.id === id);
                if (!flow) return;
                sync.upsertFlow({ ...flow, name });
              }}
              onSendChat={sync.sendChat}
            />
          ) : null}
          {!isPublic ? (
          <CanvasContextMenu menu={menu} onClose={closeMenu}>
            {menu?.kind === "pane" ? (
              <>
                <ContextMenuLabel>Canvas</ContextMenuLabel>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    createNode("service", menu.flow);
                    closeMenu();
                  }}
                >
                  Add service
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    addNode({
                      id: crypto.randomUUID(),
                      type: "group",
                      position: menu.flow,
                      width: 520,
                      height: 280,
                      data: { kind: "group", title: "Subworkflow", tags: [], childCount: 0 },
                    });
                    closeMenu();
                  }}
                >
                  Add subworkflow
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    addNote("text", menu.flow);
                    closeMenu();
                  }}
                >
                  Add text
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    addNote("comment", menu.flow);
                    closeMenu();
                  }}
                >
                  Add comment
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onSelect={() => {
                    fitView({ duration: 220 });
                    closeMenu();
                  }}
                >
                  Fit to screen
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => {
                    setNodes((current) => current.map((node) => ({ ...node, selected: true })));
                    closeMenu();
                  }}
                >
                  Select all
                </ContextMenuItem>
              </>
            ) : null}
            {menu?.kind === "node" ? (
              <>
                <ContextMenuLabel>Node</ContextMenuLabel>
                {menu.nodeType === "infra" ? (
                  <ContextMenuItem
                    onSelect={() => {
                      void openInner(menu.nodeId);
                      closeMenu();
                    }}
                  >
                    Open inner diagram
                  </ContextMenuItem>
                ) : null}
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    sync.duplicateNodes([menu.nodeId]);
                    closeMenu();
                  }}
                >
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    selectNodeOnly(menu.nodeId);
                    groupSelection();
                    closeMenu();
                  }}
                  shortcut="⌘G"
                >
                  {menu.nodeType === "group" ? "Unpack subworkflow" : "Group selection"}
                </ContextMenuItem>
                {menu.nodeType === "group" ? (
                  <ContextMenuItem
                    disabled={sync.readOnly}
                    onSelect={() => {
                      sync.commitNodes(ungroupNode(sync.nodes, menu.nodeId));
                      closeMenu();
                    }}
                    shortcut="⇧⌘G"
                  >
                    Unpack here
                  </ContextMenuItem>
                ) : null}
                <ContextMenuSeparator />
                <ContextMenuItem
                  danger
                  disabled={sync.readOnly}
                  onSelect={() => {
                    sync.deleteNodes([menu.nodeId]);
                    closeMenu();
                  }}
                  shortcut="⌫"
                >
                  Delete
                </ContextMenuItem>
              </>
            ) : null}
            {menu?.kind === "edge" ? (
              <>
                <ContextMenuLabel>Connection</ContextMenuLabel>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    const edge = sync.edges.find((item) => item.id === menu.edgeId);
                    const animated = Boolean(
                      (edge?.data as { animated?: boolean } | undefined)?.animated ?? edge?.animated,
                    );
                    sync.updateEdge(menu.edgeId, { animated: !animated });
                    closeMenu();
                  }}
                >
                  Toggle data flow
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={sync.readOnly}
                  onSelect={() => {
                    createFlow([menu.edgeId]);
                    closeMenu();
                  }}
                >
                  Create flow from edge
                </ContextMenuItem>
                {sync.meta.flows.length ? <ContextMenuSeparator /> : null}
                {sync.meta.flows.map((flow) => {
                  const inFlow = flow.edgeIds.includes(menu.edgeId);
                  return (
                    <ContextMenuItem
                      key={flow.id}
                      disabled={sync.readOnly}
                      onSelect={() => {
                        sync.toggleEdgeInFlow(flow.id, menu.edgeId);
                        closeMenu();
                      }}
                    >
                      {inFlow ? `Remove from ${flow.name}` : `Add to ${flow.name}`}
                    </ContextMenuItem>
                  );
                })}
                <ContextMenuSeparator />
                <ContextMenuItem
                  danger
                  disabled={sync.readOnly}
                  onSelect={() => {
                    sync.deleteEdges([menu.edgeId]);
                    closeMenu();
                  }}
                  shortcut="⌫"
                >
                  Delete
                </ContextMenuItem>
              </>
            ) : null}
          </CanvasContextMenu>
          ) : null}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-zinc-500">
            {isPublic ? (
              <>
                <span className="size-1.5 rounded-full bg-sky-400" />
                Public view · Sign in to collaborate
              </>
            ) : (
              <>
                <span className={`size-1.5 rounded-full ${sync.connected ? "bg-emerald-400" : "bg-amber-400"}`} />
                {sync.connected
                  ? sync.saved
                    ? "Live · All changes saved"
                    : "Live · Syncing..."
                  : "Connecting to realtime…"}
                {sync.readOnly ? " · View only" : ""}
                {sync.presence.length ? ` · ${sync.presence.length} online` : ""}
              </>
            )}
          </div>
          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1 rounded-xl border border-[#2a2a2e] bg-[#141416] px-1 py-1 text-xs text-zinc-400">
            <button className="grid size-7 place-items-center rounded-lg hover:bg-white/5" onClick={() => void zoomOut()}>
              <Minus className="size-3.5" />
            </button>
            <span className="px-1">{Math.round(zoom * 100)}%</span>
            <button className="grid size-7 place-items-center rounded-lg hover:bg-white/5" onClick={() => void zoomIn()}>
              <Plus className="size-3.5" />
            </button>
            <button className="px-2 hover:text-white" onClick={() => fitView()}>
              Fit to screen
            </button>
          </div>
        </div>
        {!isPublic && rightOpen ? (
          <aside className="w-[420px] shrink-0 border-l border-[#1e1e22] bg-[#0b0b0d]">
            {selectedEdge && !selected ? (
              <EdgeDetails
                edge={selectedEdge}
                flows={sync.meta.flows}
                onChange={(patch) => sync.updateEdge(selectedEdge.id, patch)}
                onToggleFlow={sync.toggleEdgeInFlow}
                onCreateFlow={(edgeId) => createFlow([edgeId])}
                onClose={() => setRightOpen(false)}
                readOnly={sync.readOnly}
              />
            ) : (
              <NodeDetails
                node={selected}
                connections={connections}
                tagDefs={tagDefs}
                onChange={(data) => selected && sync.updateNode(selected.id, data)}
                onUpsertTagDef={sync.upsertTagDef}
                onOpenInner={() => void openInner()}
                onSelectNode={selectNodeOnly}
                onUngroup={ungroupSelection}
                onClose={() => setRightOpen(false)}
                readOnly={sync.readOnly}
              />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Tool({ icon, onClick, active }: { icon: ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button
      className={`grid size-8 place-items-center rounded-xl hover:bg-white/5 hover:text-white ${
        active ? "bg-white/10 text-white" : "text-zinc-400"
      }`}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
