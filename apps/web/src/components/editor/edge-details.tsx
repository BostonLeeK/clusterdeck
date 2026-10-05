"use client";

import type { Edge } from "@xyflow/react";
import { Input, Label } from "@/components/ui/input";

export function EdgeDetails({
  edge,
  onChange,
  readOnly,
}: {
  edge?: Edge;
  onChange: (patch: { label?: string; animated?: boolean }) => void;
  readOnly: boolean;
}) {
  if (!edge) {
    return (
      <div className="p-4">
        <div className="text-sm font-medium">Edge details</div>
        <p className="mt-3 text-sm text-zinc-500">Select a connection</p>
      </div>
    );
  }

  const animated = Boolean((edge.data as { animated?: boolean } | undefined)?.animated ?? edge.animated);
  const label = typeof edge.label === "string" ? edge.label : "";

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <div className="mb-4 text-sm font-medium">Edge details</div>
      <div className="mb-4 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3 text-sm">
        <div className="text-xs text-zinc-500">Connection</div>
        <div className="mt-1 text-zinc-200">
          {edge.source} <span className="text-zinc-500">→</span> {edge.target}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edge-label">Label</Label>
        <Input
          id="edge-label"
          disabled={readOnly}
          value={label}
          placeholder="gRPC, SQL, events…"
          onChange={(event) => onChange({ label: event.target.value })}
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
    </div>
  );
}
