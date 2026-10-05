"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Node } from "@xyflow/react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, X } from "lucide-react";
import type {
  DiagramNode,
  InfraNodeData,
  NodeLifecycle,
  NodeScope,
  NodeShape,
  NodeStatus,
  NoteNodeData,
  TagDef,
} from "@dataflow/shared";
import {
  ACCENT_SWATCHES,
  NODE_LIBRARY,
  NODE_LIFECYCLES,
  NODE_SCOPES,
  NODE_SHAPES,
  TECH_CATALOG,
  nodeTypeById,
  resolveAccentColor,
  resolveTagColor,
  techById,
} from "@dataflow/shared";
import { NODE_ICONS, TECH_ICONS } from "@/lib/icons";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownField } from "@/components/editor/markdown-field";
import { cn } from "@/lib/utils";

type ConnectionItem = { id: string; title: string; label?: string };

function PanelHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="text-sm font-medium">{title}</div>
      {onClose ? (
        <button
          type="button"
          title="Close panel"
          className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function NodeDetails({
  node,
  connections,
  tagDefs,
  onChange,
  onUpsertTagDef,
  onOpenInner,
  onSelectNode,
  onUngroup,
  onClose,
  readOnly,
}: {
  node?: Node;
  connections: { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };
  tagDefs: TagDef[];
  onChange: (data: DiagramNode["data"]) => void;
  onUpsertTagDef: (label: string, color: string) => void;
  onOpenInner: () => void;
  onSelectNode?: (id: string) => void;
  onUngroup?: () => void;
  onClose?: () => void;
  readOnly: boolean;
}) {
  if (!node) {
    return (
      <div className="p-4">
        <PanelHeader title="Node details" onClose={onClose} />
        <p className="mt-3 text-sm text-zinc-500">Select a node</p>
      </div>
    );
  }
  const payload = node.data as DiagramNode["data"];
  if (payload.kind === "note") {
    return <NoteDetails data={payload} readOnly={readOnly} onChange={onChange} onClose={onClose} />;
  }
  if (payload.kind === "group") {
    return (
      <div className="space-y-3 p-4">
        <PanelHeader title="Subworkflow" onClose={onClose} />
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
        <PanelHeader title="Node details" onClose={onClose} />
        <div className="text-sm">{payload.title}</div>
        <p className="text-sm text-zinc-500">Inherited connection from the parent diagram.</p>
      </div>
    );
  }
  return (
    <InfraDetails
      data={payload}
      connections={connections}
      tagDefs={tagDefs}
      readOnly={readOnly}
      onChange={onChange}
      onUpsertTagDef={onUpsertTagDef}
      onOpenInner={onOpenInner}
      onSelectNode={onSelectNode}
      onClose={onClose}
    />
  );
}

function NoteDetails({
  data,
  readOnly,
  onChange,
  onClose,
}: {
  data: NoteNodeData;
  readOnly: boolean;
  onChange: (data: DiagramNode["data"]) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-3 p-4">
      <PanelHeader title={data.tone === "comment" ? "Comment" : "Text"} onClose={onClose} />
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
  tagDefs,
  readOnly,
  onChange,
  onUpsertTagDef,
  onOpenInner,
  onSelectNode,
  onClose,
}: {
  data: InfraNodeData;
  connections: { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };
  tagDefs: TagDef[];
  readOnly: boolean;
  onChange: (data: DiagramNode["data"]) => void;
  onUpsertTagDef: (label: string, color: string) => void;
  onOpenInner: () => void;
  onClose?: () => void;
  onSelectNode?: (id: string) => void;
}) {
  const meta = nodeTypeById(data.typeId);
  const Icon = NODE_ICONS[data.typeId];
  const status = data.status ?? "unknown";
  const accent = resolveAccentColor(data);
  const [tagDraft, setTagDraft] = useState("");
  const [tagColor, setTagColor] = useState<string>(ACCENT_SWATCHES[0]!);
  const [techQuery, setTechQuery] = useState("");

  function patch(partial: Partial<InfraNodeData>) {
    onChange({ ...data, ...partial });
  }

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag || data.tags.includes(tag)) return;
    onUpsertTagDef(tag, tagColor);
    patch({ tags: [...data.tags, tag] });
    setTagDraft("");
  }

  const techResults = useMemo(() => {
    const q = techQuery.trim().toLowerCase();
    const selected = new Set(data.technologies ?? []);
    return TECH_CATALOG.filter((item) => {
      if (selected.has(item.id)) return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || item.id.includes(q);
    }).slice(0, 8);
  }, [data.technologies, techQuery]);

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <PanelHeader title="Node details" onClose={onClose} />
      <div className="mb-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-white/5" style={{ color: accent }}>
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
          onChange={(event) => {
            const typeId = event.target.value as InfraNodeData["typeId"];
            const next = nodeTypeById(typeId);
            patch({
              typeId,
              subtitle: next?.subtitle ?? data.subtitle,
              shape: next?.defaultShape,
              scope: next?.defaultScope,
              accentColor: undefined,
            });
          }}
        >
          {NODE_LIBRARY.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
        <div className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Appearance</div>
        <Field label="Shape">
          <select
            disabled={readOnly}
            className="h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#0b0b0d] px-3 text-sm"
            value={data.shape ?? meta?.defaultShape ?? "rounded"}
            onChange={(event) => patch({ shape: event.target.value as NodeShape })}
          >
            {NODE_SHAPES.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </select>
        </Field>
        <div className="mt-3">
          <Label>Accent color</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ACCENT_SWATCHES.map((color) => (
              <button
                key={color}
                type="button"
                disabled={readOnly}
                title={color}
                className={cn(
                  "size-6 rounded-full border-2",
                  accent === color ? "border-white" : "border-transparent",
                )}
                style={{ background: color }}
                onClick={() => patch({ accentColor: color })}
              />
            ))}
            {!readOnly ? (
              <button
                type="button"
                className="h-6 rounded-full border border-[#2a2a2e] px-2 text-[10px] text-zinc-500 hover:text-white"
                onClick={() => patch({ accentColor: undefined })}
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <Field label="Display description">
        <Input
          disabled={readOnly}
          value={data.displayDescription ?? ""}
          placeholder="Short label shown on the canvas"
          onChange={(event) => patch({ displayDescription: event.target.value })}
        />
      </Field>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
        <Field label="Lifecycle">
          <select
            disabled={readOnly}
            className="h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 text-sm"
            value={data.lifecycle ?? "live"}
            onChange={(event) => patch({ lifecycle: event.target.value as NodeLifecycle })}
          >
            {NODE_LIFECYCLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Scope">
        <select
          disabled={readOnly}
          className="h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 text-sm"
          value={data.scope ?? meta?.defaultScope ?? "internal"}
          onChange={(event) => patch({ scope: event.target.value as NodeScope })}
        >
          {NODE_SCOPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
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
        <Label>Technologies</Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(data.technologies ?? []).map((id) => {
            const tech = techById(id);
            const TechIcon = TECH_ICONS[tech?.icon ?? "box"];
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-zinc-300"
              >
                {TechIcon ? <TechIcon className="size-3" style={{ color: tech?.color }} /> : null}
                {tech?.label ?? id}
                {!readOnly ? (
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-white"
                    onClick={() =>
                      patch({ technologies: (data.technologies ?? []).filter((item) => item !== id) })
                    }
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </span>
            );
          })}
        </div>
        {!readOnly ? (
          <div className="mt-2 space-y-1">
            <Input
              className="h-9"
              placeholder="Search tech…"
              value={techQuery}
              onChange={(event) => setTechQuery(event.target.value)}
            />
            {techResults.length ? (
              <div className="overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#121214]">
                {techResults.map((item) => {
                  const TechIcon = TECH_ICONS[item.icon];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-zinc-300 hover:bg-white/5"
                      onClick={() => {
                        patch({ technologies: [...(data.technologies ?? []), item.id] });
                        setTechQuery("");
                      }}
                    >
                      {TechIcon ? <TechIcon className="size-3.5" style={{ color: item.color }} /> : null}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Tags</Label>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-zinc-100"
              style={{ background: `${resolveTagColor(tag, tagDefs)}33` }}
            >
              <span className="size-1.5 rounded-full" style={{ background: resolveTagColor(tag, tagDefs) }} />
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
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "size-5 rounded-full border-2",
                    tagColor === color ? "border-white" : "border-transparent",
                  )}
                  style={{ background: color }}
                  onClick={() => setTagColor(color)}
                />
              ))}
            </div>
            <div className="flex gap-2">
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
