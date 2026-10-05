"use client";

import type { Node } from "@xyflow/react";
import { Layers } from "lucide-react";
import { NODE_ICONS } from "@/lib/icons";

export function Outline({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: Node[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const visible = nodes.filter((node) => node.type !== "port");
  const groups = visible.filter((node) => node.type === "group");
  const rest = visible.filter((node) => node.type !== "group");

  return (
    <div className="border-t border-[#1e1e22]">
      <div className="px-3 py-2.5 text-sm font-medium">Layers / Outline</div>
      <div className="max-h-64 space-y-0.5 overflow-auto px-2 pb-3">
        {groups.map((group) => (
          <div key={group.id}>
            <Row
              node={group}
              active={selectedId === group.id}
              onSelect={onSelect}
              badge={String((group.data as { childCount?: number }).childCount ?? "")}
            />
            {rest
              .filter((node) => node.parentId === group.id)
              .map((node) => (
                <Row key={node.id} node={node} active={selectedId === node.id} onSelect={onSelect} nested />
              ))}
          </div>
        ))}
        {rest
          .filter((node) => !node.parentId)
          .map((node) => (
            <Row key={node.id} node={node} active={selectedId === node.id} onSelect={onSelect} />
          ))}
      </div>
    </div>
  );
}

function Row({
  node,
  active,
  nested,
  badge,
  onSelect,
}: {
  node: Node;
  active: boolean;
  nested?: boolean;
  badge?: string;
  onSelect: (id: string) => void;
}) {
  const data = node.data as { title?: string; typeId?: keyof typeof NODE_ICONS };
  const Icon = data.typeId ? NODE_ICONS[data.typeId] : Layers;
  return (
    <button
      onClick={() => onSelect(node.id)}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] ${
        nested ? "pl-6" : ""
      } ${active ? "bg-[#2a2448] text-white" : "text-zinc-400 hover:bg-white/5"}`}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{data.title ?? node.id}</span>
      {badge ? <span className="ml-auto text-[10px] text-zinc-500">{badge}</span> : null}
    </button>
  );
}
