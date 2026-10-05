"use client";

import { useState, type ReactNode } from "react";
import type { Node } from "@xyflow/react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, X } from "lucide-react";
import type { DiagramNode, InfraNodeData, NodeStatus, NoteNodeData } from "@dataflow/shared";
import { NODE_LIBRARY, nodeTypeById } from "@dataflow/shared";
import { NODE_ICONS } from "@/lib/icons";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownField } from "@/components/editor/markdown-field";
import { cn } from "@/lib/utils";

type ConnectionItem = { id: string; title: string; label?: string };

export function NodeDetails({
  node,
  connections,
  onChange,
  onOpenInner,
  onSelectNode,
  onUngroup,
  readOnly,
}: {
  node?: Node;
  connections: { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };
  onChange: (data: DiagramNode["data"]) => void;
  onOpenInner: () => void;
  onSelectNode?: (id: string) => void;
  onUngroup?: () => void;
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
  if (payload.kind === "note") {
    return <NoteDetails data={payload} readOnly={readOnly} onChange={onChange} />;
  }
  if (payload.kind === "group") {
    return (
      <div className="space-y-3 p-4">
        <div className="text-sm font-medium">Subworkflow</div>
        <p className="text-sm text-zinc-500">{payload.childCount ?? 0} nodes inside</p>
        {!readOnly ? (
          <>
            <Field label="Title">
              <Input value={payload.title} onChange={(event) => onChange({ ...payload, title: event.target.value })} />
            </Field>
            <Button variant="secondary" className="w-full" onClick={onUngroup}>
              Unpack subworkflow
            </Button>
          </>
        ) : null}
      </div>
    );
  }
  if (payload.kind !== "infra") {
    return (
      <div className="space-y-3 p-4">
        <div className="text-sm font-medium">Node details</div>
        <div className="text-sm">{payload.title}</div>
        <p className="text-sm text-zinc-500">Inherited connection from the parent diagram.</p>
      </div>
    );
  }
  return (
    <InfraDetails
      data={payload}
      connections={connections}
      readOnly={readOnly}
      onChange={onChange}
      onOpenInner={onOpenInner}
      onSelectNode={onSelectNode}
    />
  );
}

function NoteDetails({
  data,
  readOnly,
  onChange,
}: {
  data: NoteNodeData;
  readOnly: boolean;
  onChange: (data: DiagramNode["data"]) => void;
}) {
  return (
    <div className="space-y-3 p-4">
      <div className="text-sm font-medium">{data.tone === "comment" ? "Comment" : "Text"}</div>
      <Field label="Title">
        <Input
          disabled={readOnly}
          value={data.title}
          onChange={(event) => onChange({ ...data, title: event.target.value })}
        />
      </Field>
      <MarkdownField
        label="Body"
        readOnly={readOnly}
        value={data.body ?? ""}
        placeholder={"Supports **markdown**, lists, and `code`."}
        onChange={(body) => onChange({ ...data, body })}
      />
    </div>
  );
}

function InfraDetails({
  data,
  connections,
  readOnly,
  onChange,
  onOpenInner,
  onSelectNode,
}: {
  data: InfraNodeData;
  connections: { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };
  readOnly: boolean;
  onChange: (data: DiagramNode["data"]) => void;
  onOpenInner: () => void;
  onSelectNode?: (id: string) => void;
}) {
  const meta = nodeTypeById(data.typeId);
  const Icon = NODE_ICONS[data.typeId];
  const status = data.status ?? "unknown";
  const [tagDraft, setTagDraft] = useState("");
  function patch(partial: Partial<InfraNodeData>) {
    onChange({ ...data, ...partial });
  }
  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || data.tags.includes(tag)) return;
    patch({ tags: [...data.tags, tag] });
    setTagDraft("");
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
      <MarkdownField
        label="Description"
        readOnly={readOnly}
        value={data.description ?? ""}
        placeholder={"Authentication service.\n\n- Validates sessions\n- Issues **JWT** tokens"}
        onChange={(description) => patch({ description })}
      />
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Tags</Label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-300">
              {tag}
              {!readOnly ? (
                <button
                  type="button"
                  className="text-zinc-500 hover:text-white"
                  onClick={() => patch({ tags: data.tags.filter((item) => item !== tag) })}
                >
                  <X className="size-3" />
                </button>
              ) : null}
            </span>
          ))}
        </div>
        {!readOnly ? (
          <div className="mt-2 flex gap-2">
            <Input
              className="h-9"
              placeholder="Add tag"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" variant="secondary" size="sm" className="h-9" onClick={addTag}>
              Add
            </Button>
          </div>
        ) : null}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Properties</Label>
          {!readOnly ? (
            <button
              type="button"
              className="text-zinc-500 hover:text-white"
              onClick={() => patch({ properties: [...data.properties, { key: "", value: "" }] })}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {data.properties.map((property, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 text-sm">
              <Input
                disabled={readOnly}
                className="h-8"
                placeholder="Key"
                value={property.key}
                onChange={(event) => {
                  const properties = data.properties.slice();
                  properties[index] = { ...property, key: event.target.value };
                  patch({ properties });
                }}
              />
              <Input
                disabled={readOnly}
                className="h-8"
                placeholder="Value"
                value={property.value}
                onChange={(event) => {
                  const properties = data.properties.slice();
                  properties[index] = { ...property, value: event.target.value };
                  patch({ properties });
                }}
              />
              {!readOnly ? (
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
                  onClick={() => patch({ properties: data.properties.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Label>Connections</Label>
        <div className="mt-2 space-y-1.5 text-xs">
          {connections.incoming.length === 0 && connections.outgoing.length === 0 ? (
            <p className="text-zinc-500">No incoming or outgoing connections</p>
          ) : null}
          {connections.incoming.map((item) => (
            <button
              key={`in-${item.id}`}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-zinc-400 hover:bg-white/5"
              onClick={() => onSelectNode?.(item.id)}
            >
              <ArrowDownLeft className="size-3.5 text-emerald-400" /> Incoming
              <span className="text-zinc-200">{item.title}</span>
              {item.label ? <span className="ml-auto text-zinc-500">{item.label}</span> : null}
            </button>
          ))}
          {connections.outgoing.map((item) => (
            <button
              key={`out-${item.id}`}
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-zinc-400 hover:bg-white/5"
              onClick={() => onSelectNode?.(item.id)}
            >
              <ArrowUpRight className="size-3.5 text-indigo-400" /> Outgoing
              <span className="text-zinc-200">{item.title}</span>
              {item.label ? <span className="ml-auto text-zinc-500">{item.label}</span> : null}
            </button>
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
