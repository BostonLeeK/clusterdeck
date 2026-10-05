"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

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
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const flowing = Boolean(animated || (data as { animated?: boolean } | undefined)?.animated);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#818cf8" : flowing ? "#6366f1" : ((style?.stroke as string) ?? "#52525b"),
          strokeWidth: selected || flowing ? 1.8 : ((style?.strokeWidth as number) ?? 1.4),
        }}
      />
      {flowing ? (
        <g className="edge-flow">
          <path
            d={path}
            fill="none"
            className="edge-flow-dash"
            stroke="#22d3ee"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle r="3.2" fill="#22d3ee" className="edge-flow-dot">
            <animateMotion dur="1.8s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="2.2" fill="#818cf8" className="edge-flow-dot edge-flow-dot-delayed">
            <animateMotion dur="1.8s" begin="0.6s" repeatCount="indefinite" path={path} />
          </circle>
        </g>
      ) : null}
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan rounded bg-zinc-950/80 px-1.5 py-0.5 text-[10px] text-zinc-400"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, position: "absolute" }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
