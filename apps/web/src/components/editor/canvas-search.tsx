"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { Layers, Search, Type, X } from "lucide-react";
import { NODE_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Hit = {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  typeId?: string;
};

function nodeSearchText(node: Node) {
  const data = node.data as {
    title?: string;
    subtitle?: string;
    typeId?: string;
    description?: string;
    displayDescription?: string;
    tags?: string[];
    technologies?: string[];
    properties?: { key?: string; value?: string }[];
  };
  return [
    data.title,
    data.subtitle,
    data.typeId,
    data.description,
    data.displayDescription,
    node.type,
    ...(data.tags ?? []),
    ...(data.technologies ?? []),
    ...(data.properties ?? []).flatMap((property) => [property.key, property.value]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function toHit(node: Node): Hit {
  const data = node.data as {
    title?: string;
    subtitle?: string;
    typeId?: string;
    kind?: string;
  };
  return {
    id: node.id,
    title: data.title?.trim() || node.type || "Node",
    subtitle: data.subtitle || data.typeId || data.kind || node.type || "",
    kind: node.type ?? "infra",
    typeId: data.typeId,
  };
}

export function CanvasSearch({
  nodes,
  open,
  onOpenChange,
  onSelect,
}: {
  nodes: Node[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        title="Search nodes (Ctrl+F)"
        className={cn(
          "grid size-8 place-items-center rounded-lg hover:bg-white/5",
          open ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-200",
        )}
        onClick={() => onOpenChange(!open)}
      >
        <Search className="size-4" />
      </button>
      {open ? (
        <SearchPanel
          nodes={nodes}
          onClose={() => onOpenChange(false)}
          onSelect={(id) => {
            onSelect(id);
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}

function SearchPanel({
  nodes,
  onClose,
  onSelect,
}: {
  nodes: Node[];
  onClose: () => void;
  onSelect: (nodeId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes
      .filter((node) => node.type !== "port")
      .filter((node) => !needle || nodeSearchText(node).includes(needle))
      .map(toHit)
      .slice(0, 40);
  }, [nodes, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-[min(420px,100%)] overflow-hidden rounded-2xl border border-[#2a2a2e] bg-[#141416]/95 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 border-b border-[#2a2a2e] px-3 py-2">
          <Search className="size-4 shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            placeholder="Search nodes on this diagram…"
            className="h-8 min-w-0 flex-1 bg-transparent text-[13px] text-zinc-100 outline-none placeholder:text-zinc-600"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((current) => Math.min(current + 1, Math.max(hits.length - 1, 0)));
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((current) => Math.max(current - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const hit = hits[active];
                if (hit) onSelect(hit.id);
              }
            }}
          />
          <kbd className="hidden rounded border border-[#2a2a2e] px-1.5 py-0.5 text-[10px] text-zinc-600 sm:inline">
            Esc
          </kbd>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-[12px] text-zinc-600">
              {query.trim() ? "No matching nodes" : "No nodes on this diagram"}
            </p>
          ) : (
            hits.map((hit, index) => {
              const Icon =
                hit.kind === "group"
                  ? Layers
                  : hit.kind === "note"
                    ? Type
                    : hit.typeId
                      ? NODE_ICONS[hit.typeId as keyof typeof NODE_ICONS]
                      : Search;
              return (
                <button
                  key={hit.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left",
                    index === active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/[0.04]",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => onSelect(hit.id)}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-zinc-400">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px]">{hit.title}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{hit.subtitle}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
