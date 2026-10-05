"use client";

import type { ReactNode } from "react";
import type { Node } from "@xyflow/react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import type { DiagramNode, InfraNodeData, NodeStatus } from "@dataflow/shared";
import { NODE_LIBRARY, nodeTypeById } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NodeDetails({
  node,
  connections,
  onChange,
  onOpenInner,
  readOnly,
}: {
  node?: Node;
  connections: { incoming: string[]; outgoing: string[] };
  onChange: (data: DiagramNode["data"]) => void;
  onOpenInner: () => void;
  readOnly: boolean;
}) {
  if (!node) {
    return (
      <div className="p-4">
        <div className="text-sm font-medium">Node details</div>
        <p className="mt-3 text-sm text-zinc-500">Select a node</p>
      </div>
    );
  }
  const payload = node.data as DiagramNode["data"];
  if (payload.kind !== "infra") {
    return (
      <div className="space-y-3 p-4">
        <div className="text-sm font-medium">Node details</div>
        <div className="text-sm">{payload.title}</div>
        <p className="text-sm text-zinc-500">
          {payload.kind === "port" ? "Inherited connection from the parent diagram." : "Group container"}
        </p>
      </div>
    );
  }
  const data = payload;
  const meta = nodeTypeById(data.typeId);
  const Icon = NODE_ICONS[data.typeId];
  const status = data.status ?? "unknown";
  function patch(partial: Partial<InfraNodeData>) {
    onChange({ ...data, ...partial });
  }
  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-4 text-sm font-medium">Node details</div>
      <div className="mb-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-white/5" style={{ color: meta?.color }}>
              <Icon className="size-4" />
            </span>
            <div>
              <div className="text-xs text-zinc-500">Selected node</div>
              <div className="text-sm font-medium">{data.title}</div>
            </div>
          </div>
          <span
            className={cn(
              "size-2 rounded-full",
              status === "healthy" && "bg-emerald-400 animate-status-pulse",
              status === "degraded" && "bg-amber-400 animate-status-glow",
              status === "offline" && "bg-red-400",
              status === "unknown" && "bg-zinc-500",
            )}
          />
        </div>
      </div>
      <Field label="Title">
        <Input value={data.title} disabled={readOnly} onChange={(event) => patch({ title: event.target.value })} />
      </Field>
      <Field label="Type">
        <select
          disabled={readOnly}
          className="h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 text-sm"
          value={data.typeId}
          onChange={(event) => patch({ typeId: event.target.value as InfraNodeData["typeId"] })}
        >
          {NODE_LIBRARY.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Status">
        <select
          disabled={readOnly}
          className="h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 text-sm"
          value={status}
          onChange={(event) => patch({ status: event.target.value as NodeStatus })}
        >
          <option value="healthy">Healthy</option>
          <option value="degraded">Degraded</option>
          <option value="offline">Offline</option>
          <option value="unknown">Unknown</option>
        </select>
      </Field>
      <Field label="Description">
        <Textarea
          disabled={readOnly}
          value={data.description ?? ""}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Tags</Label>
          <span className="text-[11px] text-indigo-400">+ Add tag</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-300">
              {tag}
            </span>
          ))}
        </div>
        {!readOnly ? (
          <Input
            className="mt-2 h-9"
            placeholder="tag, another"
            value={data.tags.join(", ")}
            onChange={(event) =>
              patch({
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              })
            }
          />
        ) : null}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Properties</Label>
          {!readOnly ? (
            <button
              className="text-zinc-500"
              onClick={() => patch({ properties: [...data.properties, { key: "Key", value: "" }] })}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {data.properties.map((property, index) => (
            <div key={`${property.key}-${index}`} className="grid grid-cols-[88px_1fr] items-center gap-2 text-sm">
              <span className="text-zinc-500">{property.key}</span>
              <Input
                disabled={readOnly}
                className="h-8"
                value={property.value}
                onChange={(event) => {
                  const properties = data.properties.slice();
                  properties[index] = { ...property, value: event.target.value };
                  patch({ properties });
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Label>Connections</Label>
        <div className="mt-2 space-y-1.5 text-xs">
          {connections.incoming.map((item) => (
            <div key={`in-${item}`} className="flex items-center gap-2 text-zinc-400">
              <ArrowDownLeft className="size-3.5 text-emerald-400" /> Incoming
              <span className="text-zinc-200">{item}</span>
            </div>
          ))}
          {connections.outgoing.map((item) => (
            <div key={`out-${item}`} className="flex items-center gap-2 text-zinc-400">
              <ArrowUpRight className="size-3.5 text-indigo-400" /> Outgoing
              <span className="text-zinc-200">{item}</span>
            </div>
          ))}
        </div>
      </div>
      <Button className="mt-auto w-full" variant="secondary" onClick={onOpenInner}>
        Open inner diagram <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
