"use client";

import { useEffect, useMemo, useState } from "react";
import type { Node } from "@xyflow/react";
import { ChevronDown, ChevronRight, Layers, MessageSquare, Search, Type } from "lucide-react";
import { NODE_ICONS } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function Outline({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: Node[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => buildTree(nodes, query.trim().toLowerCase()), [nodes, query]);

  useEffect(() => {
    if (!selectedId) return;
    const parentId = nodes.find((node) => node.id === selectedId)?.parentId;
    if (!parentId) return;
    setCollapsed((current) => (current[parentId] ? { ...current, [parentId]: false } : current));
  }, [nodes, selectedId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-[#1e1e22]">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="text-sm font-medium">Layers / Outline</div>
        <span className="text-[11px] text-zinc-600">{tree.total}</span>
      </div>
      <div className="px-3 pb-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter layers..."
            className="h-8 w-full rounded-lg border border-[#2a2a2e] bg-[#121214] pr-2.5 pl-8 text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-primary/60"
          />
        </label>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-1.5 pb-3">
        <div className="space-y-0.5 px-1">
          {tree.roots.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] text-zinc-600">
              {query ? "No matching layers" : "No nodes on the canvas"}
            </p>
          ) : (
            tree.roots.map((item) => (
              <TreeRow
                key={item.node.id}
                item={item}
                depth={0}
                selectedId={selectedId}
                collapsed={collapsed}
                onToggle={(id) => setCollapsed((current) => ({ ...current, [id]: !current[id] }))}
                onSelect={onSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

type TreeItem = {
  node: Node;
  children: TreeItem[];
};

function TreeRow({
  item,
  depth,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
}: {
  item: TreeItem;
  depth: number;
  selectedId?: string;
  collapsed: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const data = item.node.data as {
    title?: string;
    typeId?: keyof typeof NODE_ICONS;
    kind?: string;
    tone?: string;
    subtitle?: string;
  };
  const hasChildren = item.children.length > 0;
  const isOpen = !collapsed[item.node.id];
  const active = selectedId === item.node.id;
  const Icon =
    item.node.type === "group"
      ? Layers
      : item.node.type === "note"
        ? data.tone === "comment"
          ? MessageSquare
          : Type
        : data.typeId
          ? NODE_ICONS[data.typeId]
          : Layers;

  return (
    <div>
      <div
        className={cn(
          "group flex w-full items-center gap-1 rounded-lg pr-1.5 text-left text-[12px]",
          active ? "bg-[#2a2448] text-white" : "text-zinc-400 hover:bg-white/[0.04]",
        )}
        style={{ paddingLeft: 6 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="grid size-5 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
            onClick={() => onToggle(item.node.id)}
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
          onClick={() => onSelect(item.node.id)}
        >
          <Icon className={cn("size-3.5 shrink-0", active ? "text-indigo-300" : "text-zinc-500")} />
          <span className="min-w-0 flex-1 truncate">{data.title ?? item.node.id}</span>
          {item.node.type === "group" ? (
            <span className="shrink-0 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-500">
              {item.children.length}
            </span>
          ) : null}
        </button>
      </div>
      {hasChildren && isOpen
        ? item.children.map((child) => (
            <TreeRow
              key={child.node.id}
              item={child}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

function buildTree(nodes: Node[], query: string) {
  const visible = nodes.filter((node) => node.type !== "port");
  const byParent = new Map<string | undefined, Node[]>();
  for (const node of visible) {
    const key = node.parentId;
    const list = byParent.get(key) ?? [];
    list.push(node);
    byParent.set(key, list);
  }

  function matches(node: Node) {
    if (!query) return true;
    const data = node.data as { title?: string; typeId?: string; kind?: string };
    return [data.title, data.typeId, data.kind, node.id]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  }

  function walk(parentId?: string): TreeItem[] {
    const children = (byParent.get(parentId) ?? []).slice().sort((a, b) => {
      if (a.type === "group" && b.type !== "group") return -1;
      if (b.type === "group" && a.type !== "group") return 1;
      const aTitle = String((a.data as { title?: string }).title ?? a.id);
      const bTitle = String((b.data as { title?: string }).title ?? b.id);
      return aTitle.localeCompare(bTitle);
    });
    return children
      .map((node) => {
        const nested = walk(node.id);
        const item = { node, children: nested };
        if (!query) return item;
        if (matches(node) || nested.length) return item;
        return null;
      })
      .filter((item): item is TreeItem => Boolean(item));
  }

  const roots = walk(undefined);
  return { roots, total: visible.length };
}
