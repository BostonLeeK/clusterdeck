import type { Edge, Node } from "@xyflow/react";
import type { DiagramEdge, DiagramNode, DiagramSnapshot, InfraNodeData } from "@dataflow/shared";
import { normalizeNodeProperties } from "@dataflow/shared";

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
    meta: child.meta,
  };
}

function resizableNodeLayout(node: DiagramNode) {
  if (node.type === "infra" || node.type === "group") {
    const style = node.width || node.height ? { width: node.width, height: node.height } : undefined;
    return {
      style,
      width: node.width,
      height: node.height,
      zIndex: node.type === "group" ? -1 : undefined,
    };
  }
  return { style: undefined, width: undefined, height: undefined, zIndex: undefined };
}

export function normalizeFlowInfraNode(node: Node): Node {
  if (node.type !== "infra") return node;
  const width =
    typeof node.width === "number"
      ? node.width
      : typeof node.style?.width === "number"
        ? node.style.width
        : undefined;
  const height =
    typeof node.height === "number"
      ? node.height
      : typeof node.style?.height === "number"
        ? node.style.height
        : undefined;
  if (typeof width !== "number" && typeof height !== "number") return node;
  return {
    ...node,
    width,
    height,
    style: {
      ...node.style,
      ...(typeof width === "number" ? { width } : null),
      ...(typeof height === "number" ? { height } : null),
    },
  };
}

export function toFlowNodes(nodes: DiagramNode[]): Node[] {
  const mapped = nodes.map((node) => {
    const layout = resizableNodeLayout(node);
    const data =
      node.data.kind === "infra"
        ? {
            ...node.data,
            properties: normalizeNodeProperties(node.data.properties),
          }
        : node.data;
    return {
      id: node.id,
      type: node.type,
      position: node.position,
      parentId: node.parentId,
      extent: node.parentId ? ("parent" as const) : node.extent,
      style: layout.style,
      data: data as unknown as Record<string, unknown>,
      width: layout.width,
      height: layout.height,
      zIndex: layout.zIndex,
    };
  });
  return sortParentsFirst(mapped);
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
    data: {
      animated: Boolean(edge.animated),
      lineShape: edge.lineShape ?? "bezier",
    },
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
  style?: { width?: number | string; height?: number | string };
  measured?: { width?: number; height?: number };
}): DiagramNode {
  const resizable = node.type === "group" || node.type === "infra";
  const width = resizable
    ? (node.width ?? (typeof node.style?.width === "number" ? node.style.width : undefined))
    : undefined;
  const height = resizable
    ? (node.height ??
      (typeof node.style?.height === "number" ? node.style.height : undefined))
    : undefined;
  return {
    id: node.id,
    type: (node.type as DiagramNode["type"]) ?? "infra",
    position: node.position,
    parentId: node.parentId,
    extent: node.parentId ? "parent" : undefined,
    width: resizable ? width : undefined,
    height,
    data: node.data as DiagramNode["data"],
  };
}

function sortParentsFirst<T extends { id: string; parentId?: string | null }>(nodes: T[]): T[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depth = (node: T) => {
    let value = 0;
    let parentId = node.parentId ?? undefined;
    const seen = new Set<string>();
    while (parentId && byId.has(parentId) && !seen.has(parentId)) {
      seen.add(parentId);
      value += 1;
      parentId = byId.get(parentId)?.parentId ?? undefined;
    }
    return value;
  };
  return [...nodes].sort((a, b) => depth(a) - depth(b));
}

function nodeSize(node: Node) {
  const width =
    (typeof node.style?.width === "number" ? node.style.width : undefined) ??
    node.width ??
    node.measured?.width ??
    (node.type === "group" ? 520 : 220);
  const height =
    (typeof node.style?.height === "number" ? node.style.height : undefined) ??
    node.height ??
    node.measured?.height ??
    (node.type === "group" ? 280 : 80);
  return { width, height };
}

function absolutePosition(node: Node, byId: Map<string, Node>) {
  let x = node.position.x;
  let y = node.position.y;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return { x, y };
}

export function groupSelectedNodes(nodes: Node[]): Node[] | null {
  const selected = nodes.filter((node) => node.selected && node.type !== "port");
  if (selected.length < 1) return null;
  if (selected.length === 1 && selected[0]?.type === "group") return null;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const selectedIds = new Set(selected.map((node) => node.id));
  const wrap = selected.filter((node) => {
    let parentId = node.parentId;
    while (parentId) {
      if (selectedIds.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId;
    }
    return true;
  });
  if (!wrap.length) return null;

  const parentIds = new Set(wrap.map((node) => node.parentId ?? ""));
  const commonParent = parentIds.size === 1 ? wrap[0]?.parentId : undefined;
  const parentAbs = commonParent && byId.get(commonParent) ? absolutePosition(byId.get(commonParent)!, byId) : { x: 0, y: 0 };

  const boxes = wrap.map((node) => {
    const abs = absolutePosition(node, byId);
    const size = nodeSize(node);
    return { node, abs, size };
  });
  const paddingX = 40;
  const paddingTop = 52;
  const paddingBottom = 32;
  const minX = Math.min(...boxes.map((box) => box.abs.x)) - paddingX;
  const minY = Math.min(...boxes.map((box) => box.abs.y)) - paddingTop;
  const maxX = Math.max(...boxes.map((box) => box.abs.x + box.size.width)) + paddingX;
  const maxY = Math.max(...boxes.map((box) => box.abs.y + box.size.height)) + paddingBottom;
  const width = Math.max(280, maxX - minX);
  const height = Math.max(180, maxY - minY);
  const groupId = crypto.randomUUID();
  const wrapIds = new Set(wrap.map((node) => node.id));

  const group: Node = {
    id: groupId,
    type: "group",
    position: { x: minX - parentAbs.x, y: minY - parentAbs.y },
    parentId: commonParent,
    extent: commonParent ? "parent" : undefined,
    width,
    height,
    style: { width, height },
    selected: true,
    zIndex: -1,
    data: {
      kind: "group",
      title: "Subworkflow",
      tags: [],
      childCount: wrap.length,
    },
  };

  return sortParentsFirst(
    withGroupCounts([
      group,
      ...nodes.map((node) => {
        if (!wrapIds.has(node.id)) return { ...node, selected: false };
        const abs = absolutePosition(node, byId);
        return {
          ...node,
          parentId: groupId,
          extent: "parent" as const,
          position: { x: abs.x - minX, y: abs.y - minY },
          selected: false,
          width: undefined,
          height: undefined,
          style: undefined,
        };
      }),
    ]),
  );
}

export function ungroupNode(nodes: Node[], groupId: string): Node[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const group = byId.get(groupId);
  if (!group || group.type !== "group") return nodes;
  const groupAbs = absolutePosition(group, byId);
  const nextParent = group.parentId;
  const parentAbs = nextParent && byId.get(nextParent) ? absolutePosition(byId.get(nextParent)!, byId) : { x: 0, y: 0 };

  return sortParentsFirst(
    withGroupCounts(
      nodes
        .filter((node) => node.id !== groupId)
        .map((node) => {
          if (node.parentId !== groupId) return node;
          return {
            ...node,
            parentId: nextParent,
            extent: nextParent ? ("parent" as const) : undefined,
            position: {
              x: groupAbs.x + node.position.x - parentAbs.x,
              y: groupAbs.y + node.position.y - parentAbs.y,
            },
            selected: true,
            width: undefined,
            height: undefined,
            style: undefined,
          };
        }),
    ),
  );
}

export function attachNodeToGroup(nodes: Node[], nodeId: string, groupId: string | null): Node[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const node = byId.get(nodeId);
  if (!node || nodeId === groupId) return nodes;
  if (groupId) {
    let parent: Node | undefined = byId.get(groupId);
    while (parent) {
      if (parent.id === nodeId) return nodes;
      parent = parent.parentId ? byId.get(parent.parentId) : undefined;
    }
  }
  const abs = absolutePosition(node, byId);
  if (!groupId) {
    return sortParentsFirst(
      withGroupCounts(
        nodes.map((item) =>
          item.id === nodeId
            ? {
                ...item,
                parentId: undefined,
                extent: undefined,
                position: abs,
                width: undefined,
                height: undefined,
                style: undefined,
              }
            : item,
        ),
      ),
    );
  }
  const group = byId.get(groupId);
  if (!group) return nodes;
  const groupAbs = absolutePosition(group, byId);
  const size = nodeSize(node);
  const paddingX = 24;
  const paddingTop = 48;
  const paddingBottom = 24;
  let relX = abs.x - groupAbs.x;
  let relY = abs.y - groupAbs.y;
  const groupSize = nodeSize(group);
  const needW = Math.max(groupSize.width, relX + size.width + paddingX);
  const needH = Math.max(groupSize.height, relY + size.height + paddingBottom);
  const shiftX = relX < paddingX ? paddingX - relX : 0;
  const shiftY = relY < paddingTop ? paddingTop - relY : 0;
  relX += shiftX;
  relY += shiftY;

  return sortParentsFirst(
    withGroupCounts(
      nodes.map((item) => {
        if (item.id === groupId) {
          return {
            ...item,
            position: { x: group.position.x - shiftX, y: group.position.y - shiftY },
            width: needW + shiftX,
            height: needH + shiftY,
            style: { width: needW + shiftX, height: needH + shiftY },
          };
        }
        if (item.id === nodeId) {
          return {
            ...item,
            parentId: groupId,
            extent: "parent" as const,
            position: { x: relX, y: relY },
            width: undefined,
            height: undefined,
            style: undefined,
          };
        }
        if (item.parentId === groupId && (shiftX || shiftY)) {
          return {
            ...item,
            position: { x: item.position.x + shiftX, y: item.position.y + shiftY },
          };
        }
        return item;
      }),
    ),
  );
}

function withGroupCounts(nodes: Node[]): Node[] {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    if (node.parentId) counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
  }
  return nodes.map((node) => {
    if (node.type !== "group") return node;
    return { ...node, data: { ...node.data, childCount: counts.get(node.id) ?? 0 } };
  });
}

export function childCountOf(data: InfraNodeData | undefined, snapshot: DiagramSnapshot) {
  if (!data?.childDiagramId) return snapshot.nodes.filter((node) => node.parentId === undefined).length;
  return data.childCount ?? 0;
}
