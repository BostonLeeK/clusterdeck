"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, Focus, Plus, X } from "lucide-react";
import type { DiagramFlow, TagDef } from "@dataflow/shared";
import { cn } from "@/lib/utils";
import type { TagPerspectiveMode } from "@/components/editor/diagram-perspective";

export function PerspectiveBar({
  tagDefs,
  flows,
  hoveredTag,
  pinnedTag,
  tagMode,
  activeFlowId,
  readOnly,
  onHoverTag,
  onPinTag,
  onTagMode,
  onActiveFlow,
  onCreateFlow,
  onRemoveFlow,
  onRenameFlow,
}: {
  tagDefs: TagDef[];
  flows: DiagramFlow[];
  hoveredTag: string | null;
  pinnedTag: string | null;
  tagMode: TagPerspectiveMode;
  activeFlowId: string | null;
  readOnly: boolean;
  onHoverTag: (tag: string | null) => void;
  onPinTag: (tag: string | null) => void;
  onTagMode: (mode: TagPerspectiveMode) => void;
  onActiveFlow: (id: string | null) => void;
  onCreateFlow: () => void;
  onRemoveFlow: (id: string) => void;
  onRenameFlow: (id: string, name: string) => void;
}) {
  const [tab, setTab] = useState<"tags" | "flows">("tags");

  return (
    <div className="absolute bottom-14 left-1/2 z-20 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#2a2a2e] bg-[#141416]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-1 border-b border-[#2a2a2e] px-2 py-1.5">
        <TabButton active={tab === "tags"} onClick={() => setTab("tags")}>
          Tags
        </TabButton>
        <TabButton active={tab === "flows"} onClick={() => setTab("flows")}>
          Flows
        </TabButton>
        {tab === "tags" ? (
          <div className="ml-auto flex items-center gap-0.5">
            <ModeButton
              active={tagMode === "highlight"}
              title="Highlight"
              onClick={() => onTagMode("highlight")}
            >
              <Eye className="size-3.5" />
            </ModeButton>
            <ModeButton active={tagMode === "focus"} title="Focus" onClick={() => onTagMode("focus")}>
              <Focus className="size-3.5" />
            </ModeButton>
            <ModeButton active={tagMode === "hide"} title="Hide others" onClick={() => onTagMode("hide")}>
              <EyeOff className="size-3.5" />
            </ModeButton>
          </div>
        ) : (
          <div className="ml-auto">
            {!readOnly ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
                onClick={onCreateFlow}
              >
                <Plus className="size-3.5" /> New flow
              </button>
            ) : null}
          </div>
        )}
      </div>
      <div className="flex max-h-28 flex-wrap items-center gap-1.5 overflow-auto px-3 py-2.5">
        {tab === "tags" ? (
          tagDefs.length === 0 ? (
            <span className="text-[11px] text-zinc-500">Add tags on a node to build perspectives</span>
          ) : (
            tagDefs.map((tag) => {
              const active = pinnedTag === tag.label || hoveredTag === tag.label;
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                    active ? "border-white/30 bg-white/10 text-white" : "border-[#2a2a2e] text-zinc-300 hover:bg-white/5",
                  )}
                  onMouseEnter={() => onHoverTag(tag.label)}
                  onMouseLeave={() => onHoverTag(null)}
                  onClick={() => onPinTag(pinnedTag === tag.label ? null : tag.label)}
                >
                  <span className="size-2 rounded-full" style={{ background: tag.color }} />
                  {tag.label}
                </button>
              );
            })
          )
        ) : flows.length === 0 ? (
          <span className="text-[11px] text-zinc-500">Create a flow to highlight a path across edges</span>
        ) : (
          flows.map((flow) => {
            const active = activeFlowId === flow.id;
            return (
              <div
                key={flow.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]",
                  active ? "border-white/30 bg-white/10" : "border-[#2a2a2e]",
                )}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-zinc-200 hover:text-white"
                  onClick={() => onActiveFlow(active ? null : flow.id)}
                >
                  <span className="size-2 rounded-full" style={{ background: flow.color }} />
                  <input
                    className="w-24 bg-transparent text-[11px] outline-none"
                    disabled={readOnly}
                    value={flow.name}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onRenameFlow(flow.id, event.target.value)}
                  />
                  <span className="text-zinc-600">{flow.edgeIds.length}</span>
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    className="grid size-5 place-items-center rounded-full text-zinc-600 hover:bg-white/5 hover:text-red-300"
                    onClick={() => onRemoveFlow(flow.id)}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-2.5 py-1 text-[11px] font-medium",
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "grid size-7 place-items-center rounded-lg",
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
