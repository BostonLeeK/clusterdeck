"use client";

import { CATEGORY_LABELS, NODE_CATEGORIES, NODE_LIBRARY, type InfraNodeTypeId } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelLeftClose } from "lucide-react";
import { useMemo, useState } from "react";

export function NodeLibrary({
  onAdd,
  onCollapse,
}: {
  onAdd: (typeId: InfraNodeTypeId) => void;
  onCollapse?: () => void;
}) {
  const [query, setQuery] = useState("");
  const items = useMemo(
    () => NODE_LIBRARY.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="text-sm font-medium">Node library</div>
        <button
          type="button"
          title="Collapse left panel"
          className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          onClick={onCollapse}
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>
      <div className="px-3 pb-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search node types..."
          className="h-9 bg-[#121214]"
        />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        <div className="space-y-4 pr-1">
          {NODE_CATEGORIES.map((category) => {
            const group = items.filter((item) => item.category === category);
            if (!group.length) return null;
            return (
              <div key={category}>
                <div className="mb-2 text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
                  {CATEGORY_LABELS[category]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {group.map((item) => {
                    const Icon = NODE_ICONS[item.id];
                    return (
                      <button
                        key={item.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("application/dataflow-node", item.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => onAdd(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2e] bg-[#121214] px-2 py-1 text-[12px] text-zinc-300 hover:bg-white/5"
                      >
                        <Icon className="size-3.5" style={{ color: item.color }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
