"use client";

import { useCallback, useMemo, useRef, type MouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Hand,
  MessageSquare,
  Minus,
  MousePointer2,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import type { DiagramSnapshot, InfraNodeTypeId, MemberRole } from "@dataflow/shared";
import { nodeTypeById } from "@dataflow/shared";
import { openOrCreateInnerDiagram } from "@/actions/diagrams";
import { ExportMenu } from "@/components/editor/export-menu";
import { LabeledEdge } from "@/components/editor/labeled-edge";
import { GroupNode, InfraNode, PortNode } from "@/components/editor/nodes";
import { EdgeDetails } from "@/components/editor/edge-details";
import { NodeDetails } from "@/components/editor/node-details";
import { NodeLibrary } from "@/components/editor/node-library";
import { Outline } from "@/components/editor/outline";
import { ShareDialog } from "@/components/editor/share-dialog";
import { Avatar } from "@/components/ui/avatar";
import { useDiagramSync } from "@/hooks/use-diagram-sync";

const nodeTypes = { infra: InfraNode, group: GroupNode, port: PortNode };
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
  user: { name?: string | null; email?: string | null; image?: string | null };
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
  const { screenToFlowPosition, fitView } = useReactFlow();
  const sync = useDiagramSync({
    diagramId: props.diagramId,
    initial: props.snapshot,
    user: props.user,
    forceReadOnly: props.forceReadOnly,
  });

  const selected = sync.selected as Node | undefined;
  const selectedEdge = sync.selectedEdge;
  const connections = useMemo(() => {
    if (!selected) return { incoming: [], outgoing: [] };
    return {
      incoming: sync.edges.filter((edge) => edge.target === selected.id).map((edge) => edge.source),
      outgoing: sync.edges.filter((edge) => edge.source === selected.id).map((edge) => edge.target),
    };
  }, [selected, sync.edges]);

  const setNodes = sync.setNodes;
  const setEdges = sync.setEdges;

  const selectNodeOnly = useCallback(
    (nodeId: string) => {
      setNodes((current) => current.map((node) => ({ ...node, selected: node.id === nodeId })));
      setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
    },
    [setEdges, setNodes],
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
      const meta = nodeTypeById(typeId);
      addNode({
        id: crypto.randomUUID(),
        type: "infra",
        position,
        data: {
          kind: "infra",
          title: meta?.label ?? typeId,
          typeId,
          subtitle: meta?.subtitle,
          tags: [],
          status: "healthy",
          properties: [],
        },
      });
    },
    [addNode],
  );

  const openInner = useCallback(async () => {
    if (!selected || selected.type !== "infra") return;
    const result = await openOrCreateInnerDiagram(props.diagramId, selected.id);
    router.push(`/editor/${props.projectId}/${result.diagramId}`);
  }, [props.diagramId, props.projectId, router, selected]);

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
        <div className="flex items-center gap-1 text-[13px] text-zinc-500">
          {props.trail.length > 1 ? (
            <button
              className="mr-1 grid size-7 place-items-center rounded-lg hover:bg-white/5"
              onClick={() => {
                const parent = props.trail[props.trail.length - 2];
                if (parent) router.push(`/editor/${props.projectId}/${parent.id}`);
              }}
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : null}
          <span className="text-zinc-200">{props.projectName}</span>
          {props.trail.map((item, index) => (
            <span key={item.id} className="flex items-center">
              <span className="mx-1.5 text-zinc-600">›</span>
              <button
                className={index === props.trail.length - 1 ? "text-white" : "hover:text-zinc-300"}
                onClick={() => router.push(`/editor/${props.projectId}/${item.id}`)}
              >
                {item.name}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5 pr-1">
            {props.members.map((member) => (
              <Avatar key={member.id} name={member.name} email={member.email} image={member.image} className="size-6 ring-2 ring-[#0b0b0d]" />
            ))}
            {sync.presence.map((user) => (
              <span key={user.clientId} className="size-6 rounded-full ring-2 ring-[#0b0b0d]" style={{ background: user.color }} />
            ))}
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
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[260px] flex-col border-r border-[#1e1e22] bg-[#0b0b0d]">
          <NodeLibrary onAdd={(typeId) => createNode(typeId)} />
          <Outline
            nodes={sync.nodes}
            selectedId={selected?.id}
            onSelect={selectNodeOnly}
          />
        </aside>
        <div className="relative min-w-0 flex-1" ref={wrapper}>
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-0.5 rounded-2xl border border-[#2a2a2e] bg-[#141416]/95 p-1">
            <Tool icon={<MousePointer2 className="size-4" />} />
            <Tool icon={<Hand className="size-4" />} />
            <Tool icon={<Plus className="size-4" />} />
            <Tool
              icon={<Square className="size-4" />}
              onClick={() =>
                sync.addNode({
                  id: crypto.randomUUID(),
                  type: "group",
                  position: { x: 120, y: 120 },
                  width: 520,
                  height: 280,
                  data: { kind: "group", title: "Group", tags: [] },
                })
              }
            />
            <Tool icon={<Type className="size-4" />} />
            <Tool icon={<MessageSquare className="size-4" />} />
          </div>
          {props.insideLabel ? (
            <div className="absolute top-3 left-16 z-10 inline-flex items-center gap-2 rounded-full border border-[#2a2a2e] bg-[#141416] px-3 py-1 text-xs text-zinc-300">
              Inside: {props.insideLabel}
            </div>
          ) : null}
          <ReactFlow
            nodes={sync.nodes}
            edges={sync.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={sync.onNodesChange}
            onEdgesChange={sync.onEdgesChange}
            onConnect={sync.onConnect}
            onNodeClick={(_, node) => selectNodeOnly(node.id)}
            onEdgeClick={(_, edge) => selectEdgeOnly(edge.id)}
            onPaneClick={() => {
              setNodes((current) => current.map((node) => ({ ...node, selected: false })));
              setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
            }}
            onPaneMouseMove={onPaneMouseMove}
            onDrop={(event) => {
              event.preventDefault();
              const typeId = event.dataTransfer.getData("application/dataflow-node") as InfraNodeTypeId;
              if (!typeId) return;
              createNode(typeId, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onNodeDoubleClick={(_, node) => {
              if (node.type === "infra") void openInner();
            }}
            fitView
            nodesDraggable={!sync.readOnly}
            nodesConnectable={!sync.readOnly}
            elementsSelectable
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
            />
            <Controls showInteractive={false} />
          </ReactFlow>
          {sync.presence.map((user) =>
            user.cursor ? (
              <div
                key={user.clientId}
                className="pointer-events-none absolute z-20 text-[10px]"
                style={{ left: 0, top: 0, transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)` }}
              >
                <div className="size-2 rounded-full" style={{ background: user.color }} />
                <span style={{ color: user.color }}>{user.name}</span>
              </div>
            ) : null,
          )}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-zinc-500">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            {sync.saved ? "All changes saved" : "Saving..."}
            {sync.readOnly ? " · View only" : ""}
          </div>
          <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1 rounded-xl border border-[#2a2a2e] bg-[#141416] px-1 py-1 text-xs text-zinc-400">
            <button className="grid size-7 place-items-center rounded-lg hover:bg-white/5" onClick={() => fitView()}>
              <Minus className="size-3.5" />
            </button>
            <span className="px-1">100%</span>
            <button className="grid size-7 place-items-center rounded-lg hover:bg-white/5" onClick={() => fitView()}>
              <Plus className="size-3.5" />
            </button>
            <button className="px-2 hover:text-white" onClick={() => fitView()}>
              Fit to screen
            </button>
          </div>
        </div>
        <aside className="w-[320px] border-l border-[#1e1e22] bg-[#0b0b0d]">
          {selectedEdge && !selected ? (
            <EdgeDetails
              edge={selectedEdge}
              onChange={(patch) => sync.updateEdge(selectedEdge.id, patch)}
              readOnly={sync.readOnly}
            />
          ) : (
            <NodeDetails
              node={selected}
              connections={connections}
              onChange={(data) => selected && sync.updateNode(selected.id, data)}
              onOpenInner={() => void openInner()}
              readOnly={sync.readOnly}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function Tool({ icon, onClick }: { icon: ReactNode; onClick?: () => void }) {
  return (
    <button className="grid size-8 place-items-center rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white" onClick={onClick}>
      {icon}
    </button>
  );
}
