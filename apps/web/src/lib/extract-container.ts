import {
  connectorHandleId,
  createInfraNodeData,
  parseConnectorHandle,
  type ConnectorDirection,
  type DiagramEdge,
  type DiagramNode,
  type DiagramSnapshot,
  type NodeConnector,
} from "@dataflow/shared";

type Point = { x: number; y: number };

const INNER_MARGIN = 80;
const CONTAINER_SIZE = { width: 240, height: 96 };

export type ContainerExtraction = {
  container: DiagramNode;
  outer: DiagramSnapshot;
  inner: DiagramSnapshot;
};

function absolutePosition(node: DiagramNode, byId: Map<string, DiagramNode>): Point {
  let { x, y } = node.position;
  let parent = node.parentId ? byId.get(node.parentId) : undefined;
  while (parent) {
    x += parent.position.x;
    y += parent.position.y;
    parent = parent.parentId ? byId.get(parent.parentId) : undefined;
  }
  return { x, y };
}

function nodeSize(node: DiagramNode) {
  const group = node.type === "group";
  return { width: node.width ?? (group ? 520 : 220), height: node.height ?? (group ? 280 : 80) };
}

function nodeTitle(node: DiagramNode | undefined) {
  const data = node?.data as { title?: string } | undefined;
  return data?.title?.trim() || "Untitled";
}

function withoutParent(node: DiagramNode, position: Point): DiagramNode {
  const next: DiagramNode = { ...node, position };
  delete next.parentId;
  delete next.extent;
  return next;
}

function collectMoved(snapshot: DiagramSnapshot, selectedIds: string[]) {
  const moved = new Set(
    selectedIds.filter((id) => snapshot.nodes.some((node) => node.id === id && node.type !== "port")),
  );
  let grew = moved.size > 0;
  while (grew) {
    grew = false;
    for (const node of snapshot.nodes) {
      if (node.parentId && moved.has(node.parentId) && !moved.has(node.id)) {
        moved.add(node.id);
        grew = true;
      }
    }
  }
  return moved;
}

export function extractToContainer(
  snapshot: DiagramSnapshot,
  selectedIds: string[],
  containerId: string,
): ContainerExtraction | null {
  const moved = collectMoved(snapshot, selectedIds);
  if (!moved.size) return null;

  const byId = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const roots = snapshot.nodes.filter((node) => moved.has(node.id) && !(node.parentId && moved.has(node.parentId)));
  const rootPositions = new Map(roots.map((node) => [node.id, absolutePosition(node, byId)]));
  const boxes = roots.map((node) => ({ position: rootPositions.get(node.id)!, size: nodeSize(node) }));
  const minX = Math.min(...boxes.map((box) => box.position.x));
  const minY = Math.min(...boxes.map((box) => box.position.y));
  const maxX = Math.max(...boxes.map((box) => box.position.x + box.size.width));
  const maxY = Math.max(...boxes.map((box) => box.position.y + box.size.height));

  const parentIds = new Set(roots.map((node) => node.parentId));
  const commonParent = parentIds.size === 1 ? roots[0]?.parentId : undefined;
  const parentNode = commonParent ? byId.get(commonParent) : undefined;
  const parentOrigin = parentNode ? absolutePosition(parentNode, byId) : { x: 0, y: 0 };

  const connectors = new Map<string, NodeConnector>();
  const resolveInner = (nodeId: string, handle: string | null | undefined) => {
    const parsed = parseConnectorHandle(handle);
    if (parsed && moved.has(parsed.nodeId)) return parsed.nodeId;
    return moved.has(nodeId) ? nodeId : null;
  };
  const connect = (direction: ConnectorDirection, innerId: string) => {
    connectors.set(`${direction}:${innerId}`, { direction, nodeId: innerId, title: nodeTitle(byId.get(innerId)) });
    return connectorHandleId(direction, innerId);
  };

  const outerEdges: DiagramEdge[] = [];
  const innerEdges: DiagramEdge[] = [];
  for (const edge of snapshot.edges) {
    const sourceInner = resolveInner(edge.source, edge.sourceHandle);
    const targetInner = resolveInner(edge.target, edge.targetHandle);
    if (sourceInner && targetInner) {
      const direct = moved.has(edge.source) && moved.has(edge.target);
      innerEdges.push(
        direct ? edge : { ...edge, source: sourceInner, target: targetInner, sourceHandle: null, targetHandle: null },
      );
      continue;
    }
    if (targetInner) {
      outerEdges.push({ ...edge, target: containerId, targetHandle: connect("in", targetInner) });
      continue;
    }
    if (sourceInner) {
      outerEdges.push({ ...edge, source: containerId, sourceHandle: connect("out", sourceInner) });
      continue;
    }
    outerEdges.push(edge);
  }

  const container: DiagramNode = {
    id: containerId,
    type: "infra",
    position: {
      x: (minX + maxX) / 2 - CONTAINER_SIZE.width / 2 - parentOrigin.x,
      y: (minY + maxY) / 2 - CONTAINER_SIZE.height / 2 - parentOrigin.y,
    },
    ...(commonParent ? { parentId: commonParent, extent: "parent" as const } : {}),
    data: {
      ...createInfraNodeData("container", { title: "Container" }),
      childCount: roots.length,
      connectors: [...connectors.values()],
    },
  };

  const remaining = snapshot.nodes.filter((node) => !moved.has(node.id));
  const childCounts = new Map<string, number>();
  for (const node of [...remaining, container]) {
    if (node.parentId) childCounts.set(node.parentId, (childCounts.get(node.parentId) ?? 0) + 1);
  }
  const outerNodes = [...remaining, container].map((node) => {
    if (node.data.kind === "group") {
      const connectorsLeft = node.data.connectors?.filter((item) => !moved.has(item.nodeId));
      return {
        ...node,
        data: { ...node.data, childCount: childCounts.get(node.id) ?? 0, connectors: connectorsLeft },
      };
    }
    return node;
  });

  const innerNodes = snapshot.nodes
    .filter((node) => moved.has(node.id))
    .map((node) => {
      const position = rootPositions.get(node.id);
      if (!position) return node;
      return withoutParent(node, { x: position.x - minX + INNER_MARGIN, y: position.y - minY + INNER_MARGIN });
    });

  return {
    container,
    outer: { ...snapshot, nodes: outerNodes, edges: outerEdges },
    inner: { nodes: innerNodes, edges: innerEdges },
  };
}
