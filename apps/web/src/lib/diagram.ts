import type { Edge, Node } from "@xyflow/react";
import type { DiagramEdge, DiagramNode, DiagramSnapshot, InfraNodeData } from "@dataflow/shared";

export function mergeInheritedPorts(
  parent: DiagramSnapshot,
  parentNodeId: string,
  child: DiagramSnapshot,
): DiagramSnapshot {
  const incoming = parent.edges.filter((edge) => edge.target === parentNodeId);
  const outgoing = parent.edges.filter((edge) => edge.source === parentNodeId);
  const ports: DiagramNode[] = [
    ...incoming.map((edge, index) => {
      const source = parent.nodes.find((node) => node.id === edge.source);
      return {
        id: `port-in-${edge.id}`,
        type: "port" as const,
        position: { x: 20, y: 80 + index * 80 },
        data: {
          kind: "port" as const,
          title: source?.data.kind === "infra" || source?.data.kind === "group" ? source.data.title : "in",
          direction: "in" as const,
          protocol: edge.label,
          parentNodeId,
          parentEdgeId: edge.id,
        },
      };
    }),
    ...outgoing.map((edge, index) => {
      const target = parent.nodes.find((node) => node.id === edge.target);
      return {
        id: `port-out-${edge.id}`,
        type: "port" as const,
        position: { x: 760, y: 80 + index * 80 },
        data: {
          kind: "port" as const,
          title: target?.data.kind === "infra" || target?.data.kind === "group" ? target.data.title : "out",
          direction: "out" as const,
          protocol: edge.label,
          parentNodeId,
          parentEdgeId: edge.id,
        },
      };
    }),
  ];
  const existing = new Set(child.nodes.map((node) => node.id));
  return {
    nodes: [...child.nodes, ...ports.filter((port) => !existing.has(port.id))],
    edges: child.edges,
  };
}

export function toFlowNodes(nodes: DiagramNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    parentId: node.parentId,
    extent: node.extent,
    style: node.width || node.height ? { width: node.width, height: node.height } : undefined,
    data: node.data as unknown as Record<string, unknown>,
    width: node.width,
    height: node.height,
  }));
}

export function toFlowEdges(edges: DiagramEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: edge.label,
    animated: Boolean(edge.animated),
    type: "labeled",
    data: { animated: Boolean(edge.animated) },
  }));
}

export function fromFlowNode(node: {
  id: string;
  type?: string;
  position: { x: number; y: number };
  parentId?: string;
  data: DiagramNode["data"];
  width?: number | null;
  height?: number | null;
}): DiagramNode {
  return {
    id: node.id,
    type: (node.type as DiagramNode["type"]) ?? "infra",
    position: node.position,
    parentId: node.parentId,
    extent: node.parentId ? "parent" : undefined,
    width: node.width ?? undefined,
    height: node.height ?? undefined,
    data: node.data as DiagramNode["data"],
  };
}

export function childCountOf(data: InfraNodeData | undefined, snapshot: DiagramSnapshot) {
  if (!data?.childDiagramId) return snapshot.nodes.filter((node) => node.parentId === undefined).length;
  return data.childCount ?? 0;
}
