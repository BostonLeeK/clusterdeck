"use client";

import { useCallback } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useStore,
  type Edge,
  type EdgeProps,
  type ReactFlowState,
} from "@xyflow/react";
import { useDiagramPerspective } from "@/components/editor/diagram-perspective";
import { flowEdgeData } from "@/lib/diagram";

const PARALLEL_GAP = 40;

type Point = { x: number; y: number };

function parallelOffset(edges: Edge[], id: string, source: string, target: string) {
  const siblings = edges
    .filter(
      (edge) =>
        (edge.source === source && edge.target === target) ||
        (edge.source === target && edge.target === source),
    )
    .map((edge) => edge.id)
    .sort();
  if (siblings.length < 2) return 0;
  const centered = siblings.indexOf(id) - (siblings.length - 1) / 2;
  return centered * PARALLEL_GAP * (source < target ? 1 : -1);
}

function controlPoint(position: Position, from: Point, to: Point): Point {
  const horizontal = position === Position.Left || position === Position.Right;
  const reach = Math.max(Math.abs(horizontal ? to.x - from.x : to.y - from.y) * 0.5, 30);
  if (position === Position.Right) return { x: from.x + reach, y: from.y };
  if (position === Position.Left) return { x: from.x - reach, y: from.y };
  if (position === Position.Bottom) return { x: from.x, y: from.y + reach };
  return { x: from.x, y: from.y - reach };
}

function normalOf(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

function offsetPath(
  lineShape: string,
  args: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
  },
  offset: number,
): [string, number, number] {
  if (lineShape === "step") {
    const horizontal = args.sourcePosition === Position.Left || args.sourcePosition === Position.Right;
    const [path, labelX, labelY] = getSmoothStepPath({
      ...args,
      ...(horizontal
        ? { centerX: (args.sourceX + args.targetX) / 2 + offset }
        : { centerY: (args.sourceY + args.targetY) / 2 + offset }),
    });
    return [path, labelX, labelY];
  }

  const source = { x: args.sourceX, y: args.sourceY };
  const target = { x: args.targetX, y: args.targetY };
  const normal = normalOf(source, target);

  if (lineShape === "straight") {
    const control = {
      x: (source.x + target.x) / 2 + normal.x * offset * 2,
      y: (source.y + target.y) / 2 + normal.y * offset * 2,
    };
    return [
      `M ${source.x},${source.y} Q ${control.x},${control.y} ${target.x},${target.y}`,
      (source.x + target.x) / 2 + normal.x * offset,
      (source.y + target.y) / 2 + normal.y * offset,
    ];
  }

  const shift = offset / 0.75;
  const first = controlPoint(args.sourcePosition, source, target);
  const second = controlPoint(args.targetPosition, target, source);
  const c1 = { x: first.x + normal.x * shift, y: first.y + normal.y * shift };
  const c2 = { x: second.x + normal.x * shift, y: second.y + normal.y * shift };
  return [
    `M ${source.x},${source.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${target.x},${target.y}`,
    (source.x + 3 * c1.x + 3 * c2.x + target.x) / 8,
    (source.y + 3 * c1.y + 3 * c2.y + target.y) / 8,
  ];
}

function arrowGlyph(from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dy) > Math.abs(dx)) return dy >= 0 ? "↓" : "↑";
  return dx >= 0 ? "→" : "←";
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8.5"
      refY="5"
      markerWidth="9"
      markerHeight="9"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M 1 1 L 9 5 L 1 9 z" fill={color} />
    </marker>
  );
}

function FlowDot({
  path,
  color,
  reverse,
  delay,
  size,
  className,
}: {
  path: string;
  color: string;
  reverse?: boolean;
  delay?: string;
  size: number;
  className: string;
}) {
  return (
    <circle r={size} fill={color} className={className}>
      <animateMotion
        dur="1.8s"
        begin={delay}
        repeatCount="indefinite"
        path={path}
        {...(reverse ? { keyPoints: "1;0", keyTimes: "0;1", calcMode: "linear" } : {})}
      />
    </circle>
  );
}

export function LabeledEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  style,
  selected,
  animated,
  data,
}: EdgeProps) {
  const perspective = useDiagramPerspective();
  const edge = flowEdgeData({ data, animated });
  const offset = useStore(
    useCallback((state: ReactFlowState) => parallelOffset(state.edges, id, source, target), [id, source, target]),
  );
  const pathArgs = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, labelX, labelY] =
    offset !== 0
      ? offsetPath(edge.lineShape, pathArgs, offset)
      : edge.lineShape === "straight"
        ? getStraightPath(pathArgs)
        : edge.lineShape === "step"
          ? getSmoothStepPath(pathArgs)
          : getBezierPath(pathArgs);

  const inActiveFlow = perspective.flowEdgeIds.has(id);
  const flowColor = perspective.activeFlow?.color;
  const dimmed = Boolean(perspective.activeFlowId) && !inActiveFlow;
  const flowing = edge.animated || inActiveFlow;
  const stroke = selected
    ? "#818cf8"
    : inActiveFlow && flowColor
      ? flowColor
      : flowing
        ? "#6366f1"
        : ((style?.stroke as string) ?? "#52525b");
  const primaryDot = inActiveFlow && flowColor ? flowColor : "#22d3ee";
  const secondaryDot = inActiveFlow && flowColor ? flowColor : "#818cf8";
  const markerId = `edge-arrow-${id}`;
  const showStart = edge.direction !== "forward";
  const showEnd = edge.direction !== "backward";

  const sourcePoint = { x: sourceX, y: sourceY };
  const targetPoint = { x: targetX, y: targetY };
  const forwardText = typeof label === "string" ? label.trim() : "";
  const reverseText = edge.direction === "both" ? (edge.reverseLabel ?? "").trim() : "";
  const labelLines =
    edge.direction === "both"
      ? [
          forwardText ? `${arrowGlyph(sourcePoint, targetPoint)} ${forwardText}` : "",
          reverseText ? `${arrowGlyph(targetPoint, sourcePoint)} ${reverseText}` : "",
        ].filter(Boolean)
      : forwardText
        ? [forwardText]
        : [];

  return (
    <>
      <defs>
        <ArrowMarker id={markerId} color={stroke} />
      </defs>
      <BaseEdge
        id={id}
        path={path}
        markerStart={showStart ? `url(#${markerId})` : undefined}
        markerEnd={showEnd ? `url(#${markerId})` : undefined}
        style={{
          ...style,
          stroke,
          strokeWidth: selected || flowing ? 1.8 : ((style?.strokeWidth as number) ?? 1.4),
          opacity: dimmed ? 0.2 : 1,
        }}
      />
      {flowing && !dimmed ? (
        <g className="edge-flow">
          <path
            d={path}
            fill="none"
            className={
              edge.direction === "both"
                ? "edge-flow-dash edge-flow-dash-still"
                : edge.direction === "backward"
                  ? "edge-flow-dash edge-flow-dash-reverse"
                  : "edge-flow-dash"
            }
            stroke={primaryDot}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <FlowDot
            path={path}
            color={primaryDot}
            size={3.2}
            reverse={edge.direction === "backward"}
            className="edge-flow-dot"
          />
          <FlowDot
            path={path}
            color={secondaryDot}
            size={2.2}
            delay={edge.direction === "both" ? "0.9s" : "0.6s"}
            reverse={edge.direction !== "forward"}
            className="edge-flow-dot edge-flow-dot-delayed"
          />
        </g>
      ) : null}
      {labelLines.length ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute flex flex-col gap-0.5 rounded-md border border-[#2a2a2e] bg-[#121214]/95 px-1.5 py-0.5 text-[10px] leading-tight text-zinc-300"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              opacity: dimmed ? 0.25 : 1,
            }}
          >
            {labelLines.map((line) => (
              <span key={line} className="whitespace-nowrap">
                {line}
              </span>
            ))}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
