"use client";

import { memo } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { Layers } from "lucide-react";
import type { GroupNodeData, InfraNodeData, NodeStatus, NoteNodeData, PortNodeData } from "@dataflow/shared";
import { nodeTypeById } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<NodeStatus, string> = {
  healthy: "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]",
  degraded: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]",
  offline: "bg-red-400",
  unknown: "bg-zinc-500",
};

const STATUS_BORDER: Record<NodeStatus, string> = {
  healthy: "border-emerald-500/35",
  degraded: "border-amber-500/35",
  offline: "border-red-500/30",
  unknown: "border-[#2a2a2e]",
};

export const InfraNode = memo(function InfraNode({ data, selected }: NodeProps) {
  const node = data as InfraNodeData;
  const meta = nodeTypeById(node.typeId);
  const Icon = NODE_ICONS[node.typeId];
  const status = node.status ?? "unknown";
  return (
    <div
      className={cn(
        "min-w-[200px] rounded-2xl border bg-[#141416] px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
        selected ? "border-indigo-400 ring-1 ring-indigo-400/40" : STATUS_BORDER[status],
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-zinc-500" />
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0 !bg-zinc-500" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-7 place-items-center rounded-lg bg-white/5"
            style={{ color: meta?.color }}
          >
            <Icon className="size-3.5" />
          </span>
          <div>
            <div className="text-[13px] font-medium">{node.title}</div>
            <div className="text-[11px] text-zinc-500">{node.subtitle ?? meta?.subtitle}</div>
          </div>
        </div>
        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full",
            STATUS_DOT[status],
            status === "healthy" && "animate-status-pulse",
            status === "degraded" && "animate-status-glow",
          )}
        />
      </div>
      {node.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
});

export const GroupNode = memo(function GroupNode({ data, selected }: NodeProps) {
  const node = data as GroupNodeData;
  return (
    <div
      className={cn(
        "relative h-full min-h-[160px] min-w-[240px] rounded-2xl border bg-[#0f0f12]/80 p-3",
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
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-zinc-500" />
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0 !bg-zinc-500" />
      <div className="pointer-events-none flex items-center gap-2">
        <div className="text-sm font-medium">{node.title}</div>
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
        "min-w-[180px] max-w-[260px] rounded-xl border px-3 py-2 text-left shadow-[0_8px_30px_rgba(0,0,0,0.25)]",
        comment ? "border-amber-500/40 bg-[#2a2214]" : "border-[#2a2a2e] bg-[#141416]",
        selected && "ring-1 ring-indigo-400/40",
      )}
    >
      <div className={cn("text-[12px] font-medium", comment ? "text-amber-200" : "text-zinc-200")}>{node.title}</div>
      {node.body ? <div className="mt-1 text-[11px] leading-4 text-zinc-400">{node.body}</div> : null}
    </div>
  );
});
