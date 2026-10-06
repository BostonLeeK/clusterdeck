"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Node } from "@xyflow/react";
import { Icon as IconifyIcon } from "@iconify/react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Building2,
  Circle,
  CircleDashed,
  CircleDot,
  CircleOff,
  Clock3,
  Cylinder,
  Eye,
  EyeOff,
  Globe2,
  Hexagon,
  Pencil,
  Plus,
  RectangleHorizontal,
  Sparkles,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type {
  DiagramNode,
  InfraNodeData,
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
  createNodeProperty,
  nodeTypeById,
  resolveAccentColor,
  resolveNodeScope,
  resolveNodeShape,
  resolveTagColor,
  techById,
} from "@dataflow/shared";
import { NODE_ICONS, TECH_ICONS } from "@/lib/icons";
import { PROPERTY_PRESETS } from "@/lib/property-icons";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MarkdownField } from "@/components/editor/markdown-field";
import { IconPicker } from "@/components/editor/icon-picker";
import { cn } from "@/lib/utils";

type ConnectionItem = { id: string; title: string; label?: string };

const SHAPE_OPTIONS = NODE_SHAPES.map((shape) => ({
  value: shape,
  label: shape,
  icon:
    shape === "rounded" ? (
      <Square className="size-3.5" />
    ) : shape === "rectangle" ? (
      <RectangleHorizontal className="size-3.5" />
    ) : shape === "cylinder" ? (
      <Cylinder className="size-3.5" />
    ) : shape === "hexagon" ? (
      <Hexagon className="size-3.5" />
    ) : shape === "actor" ? (
      <UserRound className="size-3.5" />
    ) : (
      <Circle className="size-3.5" />
    ),
}));

const STATUS_OPTIONS: { value: NodeStatus; label: string; icon: ReactNode }[] = [
  { value: "healthy", label: "Healthy", icon: <CircleDot className="size-3.5 text-emerald-400" /> },
  { value: "degraded", label: "Degraded", icon: <CircleDashed className="size-3.5 text-amber-400" /> },
  { value: "offline", label: "Offline", icon: <CircleOff className="size-3.5 text-red-400" /> },
  { value: "unknown", label: "Unknown", icon: <Circle className="size-3.5 text-zinc-500" /> },
];

const LIFECYCLE_OPTIONS = NODE_LIFECYCLES.map((item) => ({
  value: item,
  label: item,
  icon:
    item === "live" ? (
      <Sparkles className="size-3.5" />
    ) : item === "future" ? (
      <Clock3 className="size-3.5" />
    ) : item === "deprecated" ? (
      <Ban className="size-3.5" />
    ) : (
      <Trash2 className="size-3.5" />
    ),
}));

const SCOPE_OPTIONS = NODE_SCOPES.map((item) => ({
  value: item,
  label: item,
  icon: item === "internal" ? <Building2 className="size-3.5" /> : <Globe2 className="size-3.5" />,
}));

function statusLabel(status: NodeStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function PanelHeader({
  title,
  onClose,
  actions,
}: {
  title: string;
  onClose?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="flex items-center gap-1">
        {actions}
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
    return (
      <NoteDetails
        key={node.id}
        data={payload}
        readOnly={readOnly}
        onChange={onChange}
        onClose={onClose}
      />
    );
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
      key={node.id}
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
  const [editing, setEditing] = useState(false);
  const canEdit = !readOnly && editing;

  return (
    <div className="space-y-3 p-4">
      <PanelHeader
        title={data.tone === "comment" ? "Comment" : "Text"}
        onClose={onClose}
        actions={
          !readOnly ? (
            <button
              type="button"
              title={editing ? "Done" : "Edit"}
              className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              onClick={() => setEditing((current) => !current)}
            >
              {editing ? <Eye className="size-4" /> : <Pencil className="size-4" />}
            </button>
          ) : null
        }
      />
      {canEdit ? (
        <>
          <Field label="Title">
            <Input value={data.title} onChange={(event) => onChange({ ...data, title: event.target.value })} />
          </Field>
          <MarkdownField
            label="Body"
            mode="edit"
            value={data.body ?? ""}
            placeholder={"Supports **markdown**, lists, and `code`."}
            onChange={(body) => onChange({ ...data, body })}
          />
        </>
      ) : (
        <>
          <div className="text-sm font-medium text-zinc-100">{data.title || "Untitled"}</div>
          <MarkdownField mode="preview" value={data.body ?? ""} />
        </>
      )}
    </div>
  );
}

function MetaChip({
  icon,
  label,
  className,
}: {
  icon?: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-2 py-1 text-[11px] capitalize text-zinc-300",
        className,
      )}
    >
      {icon}
      {label}
    </span>
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
  const shape = resolveNodeShape(data);
  const scope = resolveNodeScope(data);
  const lifecycle = data.lifecycle ?? "live";
  const [editing, setEditing] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [tagColor, setTagColor] = useState<string>(ACCENT_SWATCHES[0]!);
  const [techQuery, setTechQuery] = useState("");
  const canEdit = !readOnly && editing;

  useEffect(() => {
    setEditing(false);
  }, [data.typeId]);

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
    });
  }, [data.technologies, techQuery]);

  const statusMeta = STATUS_OPTIONS.find((item) => item.value === status);
  const lifecycleMeta = LIFECYCLE_OPTIONS.find((item) => item.value === lifecycle);
  const scopeMeta = SCOPE_OPTIONS.find((item) => item.value === scope);
  const shapeMeta = SHAPE_OPTIONS.find((item) => item.value === shape);

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <PanelHeader
        title="Node details"
        onClose={onClose}
        actions={
          !readOnly ? (
            <button
              type="button"
              title={editing ? "Preview" : "Edit"}
              className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              onClick={() => setEditing((current) => !current)}
            >
              {editing ? <Eye className="size-4" /> : <Pencil className="size-4" />}
            </button>
          ) : null
        }
      />

      <div className="mb-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5" style={{ color: accent }}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-zinc-500">{meta?.label ?? data.typeId}</div>
              <div className="truncate text-sm font-medium">{data.title}</div>
              {data.subtitle ? <div className="truncate text-[11px] text-zinc-500">{data.subtitle}</div> : null}
            </div>
          </div>
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              status === "healthy" && "bg-emerald-400 animate-status-pulse",
              status === "degraded" && "bg-amber-400 animate-status-glow",
              status === "offline" && "bg-red-400",
              status === "unknown" && "bg-zinc-500",
            )}
          />
        </div>
      </div>

      {!canEdit ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <MetaChip icon={statusMeta?.icon} label={statusLabel(status)} />
            <MetaChip icon={lifecycleMeta?.icon} label={lifecycle} />
            <MetaChip icon={scopeMeta?.icon} label={scope} />
            <MetaChip icon={shapeMeta?.icon} label={shape} />
          </div>

          {data.displayDescription ? (
            <p className="text-sm leading-5 text-zinc-300">{data.displayDescription}</p>
          ) : null}

          {(data.description ?? "").trim() ? (
            <MarkdownField mode="preview" value={data.description ?? ""} />
          ) : null}

          {(data.technologies ?? []).length ? (
            <div>
              <div className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Technologies</div>
              <div className="flex flex-wrap gap-1.5">
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
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {data.tags.length ? (
            <div>
              <div className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-zinc-100"
                    style={{ background: `${resolveTagColor(tag, tagDefs)}33` }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: resolveTagColor(tag, tagDefs) }} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {data.properties.length ? (
            <div>
              <div className="mb-1.5 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">Properties</div>
              <div className="space-y-1.5">
                {data.properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-1.5 text-[12px]"
                  >
                    {property.icon ? (
                      <IconifyIcon icon={property.icon} className="size-3.5 shrink-0 text-zinc-400" />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 truncate text-zinc-500">{property.key || "—"}</span>
                    <span className="ml-auto min-w-0 truncate text-zinc-200">{property.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <ConnectionsBlock connections={connections} onSelectNode={onSelectNode} />
        </div>
      ) : (
        <>
          <Field label="Title">
            <Input value={data.title} onChange={(event) => patch({ title: event.target.value })} />
          </Field>
          <Field label="Type">
            <FormSelect
              value={data.typeId}
              onValueChange={(next) => {
                const typeId = next as InfraNodeData["typeId"];
                const meta = nodeTypeById(typeId);
                patch({
                  typeId,
                  subtitle: meta?.subtitle ?? data.subtitle,
                  shape: meta?.defaultShape,
                  scope: meta?.defaultScope,
                  accentColor: undefined,
                });
              }}
              options={NODE_LIBRARY.map((item) => ({ value: item.id, label: item.label }))}
            />
          </Field>

          <MarkdownField
            label="Description"
            mode="edit"
            value={data.description ?? ""}
            placeholder={"Authentication service.\n\n- Validates sessions\n- Issues **JWT** tokens"}
            onChange={(description) => patch({ description })}
          />

          <div className="mt-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
            <div className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">Appearance</div>
            <Field label="Shape">
              <SegmentedControl
                value={shape}
                options={SHAPE_OPTIONS}
                variant="icons"
                onChange={(next) => patch({ shape: next })}
              />
            </Field>
            <div className="mt-3">
              <Label>Accent color</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ACCENT_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    className={cn(
                      "size-6 rounded-full border-2",
                      accent === color ? "border-white" : "border-transparent",
                    )}
                    style={{ background: color }}
                    onClick={() => patch({ accentColor: color })}
                  />
                ))}
                <button
                  type="button"
                  className="h-6 rounded-full border border-[#2a2a2e] px-2 text-[10px] text-zinc-500 hover:text-white"
                  onClick={() => patch({ accentColor: undefined })}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <Field label="Display description">
            <Input
              value={data.displayDescription ?? ""}
              placeholder="Short label shown on the canvas"
              onChange={(event) => patch({ displayDescription: event.target.value })}
            />
          </Field>

          <Field label="Status">
            <SegmentedControl value={status} options={STATUS_OPTIONS} onChange={(next) => patch({ status: next })} />
          </Field>
          <Field label="Lifecycle">
            <SegmentedControl
              value={lifecycle}
              options={LIFECYCLE_OPTIONS}
              onChange={(next) => patch({ lifecycle: next })}
            />
          </Field>
          <Field label="Scope">
            <SegmentedControl value={scope} options={SCOPE_OPTIONS} onChange={(next) => patch({ scope: next })} />
          </Field>

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
                    <button
                      type="button"
                      className="text-zinc-500 hover:text-white"
                      onClick={() =>
                        patch({ technologies: (data.technologies ?? []).filter((item) => item !== id) })
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 space-y-1">
              <Input
                className="h-9"
                placeholder="Search tech…"
                value={techQuery}
                onChange={(event) => setTechQuery(event.target.value)}
              />
              {techResults.length ? (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-[#2a2a2e] bg-[#121214]">
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
          </div>

          <div className="mt-4">
            <Label>Tags</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-zinc-100"
                  style={{ background: `${resolveTagColor(tag, tagDefs)}33` }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: resolveTagColor(tag, tagDefs) }} />
                  {tag}
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-white"
                    onClick={() => patch({ tags: data.tags.filter((item) => item !== tag) })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
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
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <Label>Properties</Label>
              <button
                type="button"
                className="text-zinc-500 hover:text-white"
                title="Add property"
                onClick={() =>
                  patch({
                    properties: [...data.properties, createNodeProperty({ key: "", value: "" })],
                  })
                }
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {PROPERTY_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-700 hover:text-white"
                  onClick={() =>
                    patch({
                      properties: [
                        ...data.properties,
                        createNodeProperty({ key: preset.key, value: preset.value ?? "", icon: preset.icon }),
                      ],
                    })
                  }
                >
                  {preset.key}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {data.properties.map((property, index) => {
                const showOnCanvas = property.showOnCanvas !== false;
                return (
                  <div
                    key={property.id}
                    className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-1.5 text-sm"
                  >
                    <IconPicker
                      value={property.icon}
                      onChange={(icon) => {
                        const properties = data.properties.slice();
                        properties[index] = { ...property, icon };
                        patch({ properties });
                      }}
                    />
                    <Input
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
                      className="h-8"
                      placeholder="Value"
                      value={property.value}
                      onChange={(event) => {
                        const properties = data.properties.slice();
                        properties[index] = { ...property, value: event.target.value };
                        patch({ properties });
                      }}
                    />
                    <button
                      type="button"
                      title={showOnCanvas ? "Hide on canvas" : "Show on canvas"}
                      className={cn(
                        "grid size-8 place-items-center rounded-lg hover:bg-white/5",
                        showOnCanvas ? "text-zinc-300" : "text-zinc-600",
                      )}
                      onClick={() => {
                        const properties = data.properties.slice();
                        properties[index] = { ...property, showOnCanvas: !showOnCanvas };
                        patch({ properties });
                      }}
                    >
                      {showOnCanvas ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white"
                      onClick={() =>
                        patch({
                          properties: data.properties.filter((item) => item.id !== property.id),
                        })
                      }
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <ConnectionsBlock connections={connections} onSelectNode={onSelectNode} />
        </>
      )}

      <Button className="mt-auto w-full" variant="secondary" onClick={onOpenInner}>
        Open inner diagram <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

function ConnectionsBlock({
  connections,
  onSelectNode,
}: {
  connections: { incoming: ConnectionItem[]; outgoing: ConnectionItem[] };
  onSelectNode?: (id: string) => void;
}) {
  return (
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
