"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";
import type { EdgeLineShape } from "@dataflow/shared";
import { useDiagramPerspective } from "@/components/editor/diagram-perspective";

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  markerEnd,
  style,
  selected,
  animated,
  data,
}: EdgeProps) {
  const perspective = useDiagramPerspective();
  const lineShape = ((data as { lineShape?: EdgeLineShape } | undefined)?.lineShape ?? "bezier") as EdgeLineShape;
  const pathArgs = {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  };
  const [path, labelX, labelY] =
    lineShape === "straight"
      ? getStraightPath(pathArgs)
      : lineShape === "step"
        ? getSmoothStepPath(pathArgs)
        : getBezierPath(pathArgs);

  const inActiveFlow = perspective.flowEdgeIds.has(id);
  const flowColor = perspective.activeFlow?.color;
  const dimmed = Boolean(perspective.activeFlowId) && !inActiveFlow;
  const flowing = Boolean(
    animated || (data as { animated?: boolean } | undefined)?.animated || inActiveFlow,
  );
  const stroke = selected
    ? "#818cf8"
    : inActiveFlow && flowColor
      ? flowColor
      : flowing
        ? "#6366f1"
        : ((style?.stroke as string) ?? "#52525b");

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: selected || flowing || inActiveFlow ? 1.8 : ((style?.strokeWidth as number) ?? 1.4),
          opacity: dimmed ? 0.2 : 1,
        }}
      />
      {flowing && !dimmed ? (
        <g className="edge-flow">
          <path
            d={path}
            fill="none"
            className="edge-flow-dash"
            stroke={inActiveFlow && flowColor ? flowColor : "#22d3ee"}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle r="3.2" fill={inActiveFlow && flowColor ? flowColor : "#22d3ee"} className="edge-flow-dot">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={path} />
          </circle>
          <circle
            r="2.2"
            fill={inActiveFlow && flowColor ? flowColor : "#818cf8"}
            className="edge-flow-dot edge-flow-dot-delayed"
          >
            <animateMotion dur="1.8s" begin="0.6s" repeatCount="indefinite" path={path} />
          </circle>
        </g>
      ) : null}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-md border border-[#2a2a2e] bg-[#121214]/95 px-1.5 py-0.5 text-[10px] text-zinc-300"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              opacity: dimmed ? 0.25 : 1,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
