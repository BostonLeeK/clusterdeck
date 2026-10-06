"use client";

import type { Edge } from "@xyflow/react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, GitCommitHorizontal, Minus, Plus, Spline, X } from "lucide-react";
import type { DiagramFlow, EdgeDirection } from "@dataflow/shared";
import { EDGE_LINE_SHAPES } from "@dataflow/shared";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { flowEdgeData, type EdgePatch } from "@/lib/diagram";
import { cn } from "@/lib/utils";

const DIRECTION_OPTIONS: SegmentOption<EdgeDirection>[] = [
  { value: "forward", label: "One way", icon: <ArrowRight className="size-3.5" />, title: "Source to target" },
  { value: "backward", label: "Reverse", icon: <ArrowLeft className="size-3.5" />, title: "Target to source" },
  { value: "both", label: "Both", icon: <ArrowLeftRight className="size-3.5" />, title: "Both directions" },
];

const LINE_SHAPE_OPTIONS = EDGE_LINE_SHAPES.map((shape) => ({
  value: shape,
  label: shape,
  icon:
    shape === "bezier" ? (
      <Spline className="size-3.5" />
    ) : shape === "straight" ? (
      <Minus className="size-3.5" />
    ) : (
      <GitCommitHorizontal className="size-3.5" />
    ),
}));

export function EdgeDetails({
  edge,
  sourceLabel,
  targetLabel,
  flows,
  onChange,
  onToggleFlow,
  onCreateFlow,
  onClose,
  readOnly,
}: {
  edge?: Edge;
  sourceLabel?: string;
  targetLabel?: string;
  flows: DiagramFlow[];
  onChange: (patch: EdgePatch) => void;
  onToggleFlow: (flowId: string, edgeId: string) => void;
  onCreateFlow: (edgeId: string) => void;
  onClose?: () => void;
  readOnly: boolean;
}) {
  if (!edge) {
    return (
      <div className="p-4">
        <Header title="Edge details" onClose={onClose} />
        <p className="mt-3 text-sm text-zinc-500">Select a connection</p>
      </div>
    );
  }

  const { animated, lineShape, direction, reverseLabel } = flowEdgeData(edge);
  const label = typeof edge.label === "string" ? edge.label : "";
  const containing = flows.filter((flow) => flow.edgeIds.includes(edge.id));
  const from = sourceLabel || "Source";
  const to = targetLabel || "Target";
  const arrow = direction === "both" ? "⇄" : direction === "backward" ? "←" : "→";

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <Header title="Edge details" onClose={onClose} />
      <div className="mb-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3 text-sm">
        <div className="text-xs text-zinc-500">Connection</div>
        <div className="mt-1 truncate text-zinc-200" title={`${from} ${arrow} ${to}`}>
          {from} <span className="text-zinc-500">{arrow}</span> {to}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Direction</Label>
        <SegmentedControl
          value={direction}
          options={DIRECTION_OPTIONS}
          disabled={readOnly}
          onChange={(next) => onChange({ direction: next })}
        />
      </div>
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="edge-label">
          {direction === "both" ? (
            <LabelTitle from={from} to={to} />
          ) : (
            "Label"
          )}
        </Label>
        <Input
          id="edge-label"
          disabled={readOnly}
          value={label}
          placeholder={direction === "both" ? "POST /metrics" : "gRPC, SQL, events…"}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </div>
      {direction === "both" ? (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="edge-reverse-label">
            <LabelTitle from={to} to={from} />
          </Label>
          <Input
            id="edge-reverse-label"
            disabled={readOnly}
            value={reverseLabel ?? ""}
            placeholder="GET /files"
            onChange={(event) => onChange({ reverseLabel: event.target.value })}
          />
        </div>
      ) : null}
      <div className="mt-4 space-y-1.5">
        <Label>Line shape</Label>
        <SegmentedControl
          value={lineShape}
          options={LINE_SHAPE_OPTIONS}
          disabled={readOnly}
          onChange={(next) => onChange({ lineShape: next })}
        />
      </div>
      <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 py-3">
        <div>
          <div className="text-sm text-zinc-200">Data flow animation</div>
          <div className="text-[11px] text-zinc-500">Animate packets along this edge</div>
        </div>
        <input
          type="checkbox"
          className="size-4 accent-indigo-400"
          disabled={readOnly}
          checked={animated}
          onChange={(event) => onChange({ animated: event.target.checked })}
        />
      </label>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <Label>Flows</Label>
          {!readOnly ? (
            <button
              type="button"
              className="text-zinc-500 hover:text-white"
              title="Create flow with this edge"
              onClick={() => onCreateFlow(edge.id)}
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>
        {flows.length === 0 ? (
          <p className="text-xs text-zinc-500">No flows yet. Create one to highlight a path.</p>
        ) : (
          <div className="space-y-1">
            {flows.map((flow) => {
              const active = flow.edgeIds.includes(edge.id);
              return (
                <button
                  key={flow.id}
                  type="button"
                  disabled={readOnly}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs",
                    active ? "border-white/20 bg-white/5" : "border-[#2a2a2e] hover:bg-white/[0.03]",
                  )}
                  onClick={() => onToggleFlow(flow.id, edge.id)}
                >
                  <span className="size-2.5 rounded-full" style={{ background: flow.color }} />
                  <span className="flex-1 text-zinc-200">{flow.name}</span>
                  <span className="text-zinc-500">{active ? "in flow" : "add"}</span>
                </button>
              );
            })}
          </div>
        )}
        {containing.length ? (
          <p className="mt-2 text-[11px] text-zinc-500">
            In {containing.map((item) => item.name).join(", ")}
          </p>
        ) : null}
      </div>
      {!readOnly && flows.length === 0 ? (
        <Button className="mt-3 w-full" variant="secondary" onClick={() => onCreateFlow(edge.id)}>
          Create flow from edge
        </Button>
      ) : null}
    </div>
  );
}

function LabelTitle({ from, to }: { from: string; to: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate">{from}</span>
      <span className="shrink-0 text-zinc-500">→</span>
      <span className="truncate">{to}</span>
    </span>
  );
}

function Header({ title, onClose }: { title: string; onClose?: () => void }) {
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
