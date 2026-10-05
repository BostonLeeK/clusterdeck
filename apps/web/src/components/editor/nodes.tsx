"use client";

import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
} from "@xyflow/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { Layers, MessageSquare, Type } from "lucide-react";
import type {
  GroupNodeData,
  InfraNodeData,
  NodeLifecycle,
  NodeShape,
  NodeStatus,
  NoteNodeData,
  PortNodeData,
} from "@dataflow/shared";
import {
  nodeTypeById,
  resolveAccentColor,
  resolveNodeScope,
  resolveNodeShape,
  resolveTagColor,
  techById,
} from "@dataflow/shared";
import { NODE_ICONS, TECH_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useDiagramPerspective } from "@/components/editor/diagram-perspective";

const INFRA_MIN_WIDTH = 200;
const INFRA_MIN_HEIGHT = 72;

const STATUS_DOT: Record<NodeStatus, string> = {
  healthy: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]",
  degraded: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]",
  offline: "bg-red-400",
  unknown: "bg-zinc-500",
};

function shapeClass(shape: NodeShape): string {
  switch (shape) {
    case "rectangle":
      return "rounded-md";
    case "stadium":
      return "rounded-full";
    case "cylinder":
      return "rounded-[40%/12px]";
    case "hexagon":
      return "rounded-none";
    case "actor":
      return "rounded-[28px]";
    default:
      return "rounded-2xl";
  }
}

const HEX_POINTS = "8,0 92,0 100,50 92,100 8,100 0,50";
const HEX_CLIP = `polygon(${HEX_POINTS.split(" ").map((point) => {
  const [x, y] = point.split(",");
  return `${x}% ${y}%`;
}).join(", ")})`;

function lifecycleStyle(lifecycle: NodeLifecycle | undefined): CSSProperties {
  if (lifecycle === "removed") return { opacity: 0.45 };
  if (lifecycle === "deprecated") return { opacity: 0.7 };
  return {};
}

function Shell({
  shape,
  selected,
  accent,
  dashed,
  future,
  className,
  style,
  children,
}: {
  shape: NodeShape;
  selected: boolean;
  accent: string;
  dashed: boolean;
  future: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const hex = shape === "hexagon";
  const borderColor = selected ? "#818cf8" : `${accent}99`;

  return (
    <div
      className={cn(
        "relative box-border w-full min-w-0 bg-[#141416] py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        hex ? "px-7" : "px-3",
        !hex && "border",
        shapeClass(shape),
        !hex && (selected ? "ring-1 ring-indigo-400/40" : null),
        !hex && (dashed || future ? "border-dashed" : "border-solid"),
        className,
      )}
      style={{
        borderColor: hex ? undefined : borderColor,
        clipPath: hex ? HEX_CLIP : undefined,
        ...style,
      }}
    >
      {hex ? (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon
            points={HEX_POINTS}
            fill="none"
            stroke={borderColor}
            strokeWidth={selected ? 2.4 : 1.8}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray={dashed || future ? "4 3" : undefined}
          />
        </svg>
      ) : null}
      {children}
    </div>
  );
}

export const InfraNode = memo(function InfraNode({ id, data, selected, width, height }: NodeProps) {
  const node = data as InfraNodeData;
  const sized = typeof width === "number" || typeof height === "number";
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentMin, setContentMin] = useState({ width: INFRA_MIN_WIDTH, height: INFRA_MIN_HEIGHT });
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const perspective = useDiagramPerspective();
  const typeMeta = nodeTypeById(node.typeId);
  const Icon = NODE_ICONS[node.typeId];
  const status = node.status ?? "unknown";
  const shape = resolveNodeShape(node);
  const scope = resolveNodeScope(node);
  const accent = resolveAccentColor(node);
  const lifecycle = node.lifecycle ?? "live";
  const techs = (node.technologies ?? []).slice(0, 3);
  const extraTech = Math.max(0, (node.technologies?.length ?? 0) - 3);
  const tags = node.tags.slice(0, 4);
  const canvasProperties = (node.properties ?? []).filter(
    (property) => property.showOnCanvas !== false && (property.value || property.key),
  );

  const activeTag = perspective.hoveredTag ?? perspective.pinnedTag;
  const matchesTag = activeTag ? node.tags.includes(activeTag) : true;
  const dimmedByTag =
    Boolean(activeTag) &&
    !matchesTag &&
    (perspective.tagMode === "highlight" || perspective.tagMode === "focus");
  const hiddenByTag = Boolean(activeTag) && !matchesTag && perspective.tagMode === "hide";
  const onActiveFlow = Boolean(perspective.activeFlowId) && perspective.flowNodeIds.has(id);
  const dimmedByFlow = Boolean(perspective.activeFlowId) && !onActiveFlow;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const syncToContent = () => {
      const nextHeight = Math.max(INFRA_MIN_HEIGHT, Math.ceil(el.scrollHeight) + 20);
      setContentMin((current) =>
        current.height === nextHeight ? current : { width: INFRA_MIN_WIDTH, height: nextHeight },
      );

      if (typeof height !== "number" || height + 0.5 >= nextHeight) return;

      setNodes((nodes) =>
        nodes.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            height: nextHeight,
            style: { ...item.style, height: nextHeight },
          };
        }),
      );
      updateNodeInternals(id);
    };

    syncToContent();
    const observer = new ResizeObserver(syncToContent);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    canvasProperties.length,
    height,
    id,
    node.description,
    node.displayDescription,
    node.subtitle,
    node.title,
    setNodes,
    tags.length,
    techs.length,
    updateNodeInternals,
    width,
  ]);

  if (hiddenByTag) {
    return <div className="pointer-events-none h-0 w-0 opacity-0" />;
  }

  return (
    <div
      className={cn("relative box-border min-h-[72px] min-w-[200px]", sized && "size-full")}
      style={{
        ...lifecycleStyle(lifecycle),
        opacity: dimmedByTag || dimmedByFlow ? 0.28 : lifecycle === "removed" ? 0.45 : undefined,
        outline:
          perspective.pinnedTag && matchesTag
            ? `1.5px dashed ${resolveTagColor(perspective.pinnedTag, perspective.tagDefs)}`
            : onActiveFlow && perspective.activeFlow
              ? `1.5px solid ${perspective.activeFlow.color}`
              : undefined,
        outlineOffset: 3,
      }}
    >
      <NodeResizer
        minWidth={INFRA_MIN_WIDTH}
        minHeight={contentMin.height}
        isVisible={selected}
        lineClassName="border-indigo-400/40"
        handleClassName="!h-2.5 !w-2.5 !rounded-full !border-indigo-400 !bg-[#141416]"
      />
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-zinc-500" />
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0 !bg-zinc-500" />
      <Shell
        shape={shape}
        selected={selected || (Boolean(activeTag) && matchesTag)}
        accent={accent}
        dashed={scope === "external"}
        future={lifecycle === "future"}
        className={cn(lifecycle === "deprecated" && "grayscale-[0.35]", sized && "size-full")}
      >
        <div ref={contentRef} className="w-full min-w-0">
        {shape === "actor" ? (
          <div className="mb-1.5 flex justify-center">
            <span
              className="grid size-8 place-items-center rounded-full border bg-white/5"
              style={{ color: accent, borderColor: `${accent}66` }}
            >
              <Icon className="size-4" />
            </span>
          </div>
        ) : null}
        <div className={cn("flex items-start justify-between gap-2", shape === "hexagon" && "pr-1")}>
          <div className="flex min-w-0 items-center gap-2.5">
            {shape !== "actor" ? (
              <span
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/5"
                style={{ color: accent }}
              >
                <Icon className="size-3.5" />
              </span>
            ) : null}
            <div className="min-w-0">
              <div
                className={cn(
                  "truncate text-[13px] font-medium",
                  lifecycle === "deprecated" && "line-through text-zinc-400",
                )}
              >
                {node.title}
              </div>
              <div className="truncate text-[11px] text-zinc-500">{node.subtitle ?? typeMeta?.subtitle}</div>
            </div>
          </div>
          <span
            className={cn(
              "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5",
              "bg-black/25",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                STATUS_DOT[status],
                status === "healthy" && "animate-status-pulse",
                status === "degraded" && "animate-status-glow",
              )}
            />
          </span>
        </div>
        {node.displayDescription ? (
          <div className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-zinc-400">{node.displayDescription}</div>
        ) : null}
        {techs.length ? (
          <div className="mt-2 flex items-center gap-1">
            {techs.map((techId) => {
              const tech = techById(techId);
              const TechIcon = TECH_ICONS[tech?.icon ?? "box"] ?? Layers;
              return (
                <span
                  key={techId}
                  title={tech?.label ?? techId}
                  className="grid size-5 place-items-center rounded-md bg-white/[0.06]"
                  style={{ color: tech?.color }}
                >
                  <TechIcon className="size-3" />
                </span>
              );
            })}
            {extraTech ? <span className="text-[10px] text-zinc-500">+{extraTech}</span> : null}
          </div>
        ) : null}
        {perspective.pinnedTag && matchesTag ? (
          <div
            className="mt-1.5 text-[10px] font-medium"
            style={{ color: resolveTagColor(perspective.pinnedTag, perspective.tagDefs) }}
          >
            {perspective.pinnedTag}
          </div>
        ) : null}
        {tags.length ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => {
              const color = resolveTagColor(tag, perspective.tagDefs);
              return (
                <span
                  key={tag}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: `${color}24`, color }}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        ) : null}
        {canvasProperties.length ? (
          <div className="mt-2 flex w-full min-w-0 flex-wrap items-center gap-1">
            {canvasProperties.map((property) => (
              <span
                key={property.id}
                title={property.key ? `${property.key}: ${property.value || "—"}` : property.value}
                className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300"
              >
                {property.icon ? <IconifyIcon icon={property.icon} className="size-3 shrink-0 text-zinc-400" /> : null}
                <span className="truncate">{property.value || property.key}</span>
              </span>
            ))}
          </div>
        ) : null}
        </div>
      </Shell>
    </div>
  );
});

export const GroupNode = memo(function GroupNode({ data, selected }: NodeProps) {
  const node = data as GroupNodeData;
  return (
    <div
      className={cn(
        "relative h-full min-h-[160px] min-w-[240px] rounded-2xl border bg-[#101014]/75 p-3",
        selected ? "border-indigo-400" : "border-[#2e2e34]",
      )}
    >
      <NodeResizer
        minWidth={240}
        minHeight={160}
        isVisible={selected}
        lineClassName="border-indigo-400/50"
        handleClassName="!h-2 !w-2 !border-indigo-400 !bg-[#141416]"
      />
      <Handle type="target" position={Position.Left} className="node-handle" />
      <Handle type="source" position={Position.Right} className="node-handle" />
      <div className="pointer-events-none flex items-center gap-2">
        <div className="text-sm font-medium text-zinc-100">{node.title}</div>
        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-indigo-300">
          <Layers className="size-3" />
          {node.childCount ?? 0}
        </span>
        <span className="text-[11px] text-zinc-500">Subworkflow</span>
      </div>
      <div className="pointer-events-none mt-0.5 text-[11px] text-zinc-500">{node.subtitle}</div>
    </div>
  );
});

export const PortNode = memo(function PortNode({ data }: NodeProps) {
  const node = data as PortNodeData;
  return (
    <div className="rounded-xl border border-dashed border-zinc-600 bg-[#141416]/40 px-3 py-2 text-xs text-zinc-400">
      <Handle
        type={node.direction === "in" ? "source" : "target"}
        position={node.direction === "in" ? Position.Right : Position.Left}
        className="!size-2.5 !border-0 !bg-zinc-500"
      />
      {node.direction === "in" ? "← " : "→ "}
      {node.title}
      {node.protocol ? <span className="ml-2 text-zinc-600">{node.protocol}</span> : null}
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ data, selected }: NodeProps) {
  const node = data as NoteNodeData;
  const comment = node.tone === "comment";
  return (
    <div
      className={cn(
        "relative w-[240px] overflow-hidden rounded-xl border px-3 py-2.5 text-left shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
        comment ? "border-amber-500/35 bg-[#241c12]" : "border-[#2a2a2e] bg-[#141416]",
        selected && "ring-1 ring-indigo-400/40",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full",
          comment ? "bg-amber-400/70" : "bg-zinc-500/70",
        )}
      />
      <div className="flex items-center gap-1.5 pl-1.5">
        {comment ? (
          <MessageSquare className="size-3.5 shrink-0 text-amber-300/80" />
        ) : (
          <Type className="size-3.5 shrink-0 text-zinc-400" />
        )}
        <div
          className={cn(
            "min-w-0 flex-1 truncate text-[12px] font-medium",
            comment ? "text-amber-100" : "text-zinc-200",
          )}
        >
          {node.title || (comment ? "Comment" : "Text")}
        </div>
      </div>
      {node.body?.trim() ? (
        <div className="mt-1.5 max-h-[132px] overflow-hidden pl-1.5 text-[11px] leading-4 break-all whitespace-pre-wrap text-zinc-400">
          {node.body}
        </div>
      ) : (
        <div className="mt-1.5 pl-1.5 text-[11px] text-zinc-600">
          {comment ? "Add a comment…" : "Add text…"}
        </div>
      )}
    </div>
  );
});
