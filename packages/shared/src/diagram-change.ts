import type { DiagramEdge, DiagramNode, DiagramSnapshot } from "./node-types";

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nodeTitle(node: DiagramNode) {
  const title = (node.data as { title?: string }).title?.trim();
  return title ? `"${title}"` : node.type;
}

function count(items: unknown[], one: string, many: string) {
  return items.length === 1 ? one : `${items.length} ${many}`;
}

function edgeName(edge: DiagramEdge, nodes: Map<string, DiagramNode>) {
  const source = nodes.get(edge.source);
  const target = nodes.get(edge.target);
  return `${source ? nodeTitle(source) : "?"} → ${target ? nodeTitle(target) : "?"}`;
}

function ids(items: { id: string }[]) {
  return items
    .map((item) => item.id)
    .sort()
    .join(",");
}

export type DiagramChange = { label: string; group: string };

export function describeDiagramChange(before: DiagramSnapshot, after: DiagramSnapshot): DiagramChange {
  const prevNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const nextNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const added = after.nodes.filter((node) => !prevNodes.has(node.id));
  const removed = before.nodes.filter((node) => !nextNodes.has(node.id));
  if (added.length) {
    return { label: `Added ${count(added, nodeTitle(added[0]!), "nodes")}`, group: `add:${ids(added)}` };
  }
  if (removed.length) {
    return { label: `Deleted ${count(removed, nodeTitle(removed[0]!), "nodes")}`, group: `delete:${ids(removed)}` };
  }

  const changed = after.nodes.filter((node) => !same(node, prevNodes.get(node.id)));
  if (changed.length) {
    const edited = changed.filter((node) => !same(node.data, prevNodes.get(node.id)?.data));
    if (edited.length) {
      return { label: `Edited ${count(edited, nodeTitle(edited[0]!), "nodes")}`, group: `edit:${ids(edited)}` };
    }
    const resized = changed.filter((node) => {
      const prev = prevNodes.get(node.id);
      return prev?.width !== node.width || prev?.height !== node.height;
    });
    if (resized.length) {
      return { label: `Resized ${count(resized, nodeTitle(resized[0]!), "nodes")}`, group: `resize:${ids(resized)}` };
    }
    const regrouped = changed.filter((node) => prevNodes.get(node.id)?.parentId !== node.parentId);
    if (regrouped.length) {
      return {
        label: `Regrouped ${count(regrouped, nodeTitle(regrouped[0]!), "nodes")}`,
        group: `regroup:${ids(regrouped)}`,
      };
    }
    return { label: `Moved ${count(changed, nodeTitle(changed[0]!), "nodes")}`, group: `move:${ids(changed)}` };
  }

  const prevEdges = new Map(before.edges.map((edge) => [edge.id, edge]));
  const nextEdgeIds = new Set(after.edges.map((edge) => edge.id));
  const addedEdges = after.edges.filter((edge) => !prevEdges.has(edge.id));
  const removedEdges = before.edges.filter((edge) => !nextEdgeIds.has(edge.id));
  if (addedEdges.length) {
    return {
      label:
        addedEdges.length === 1
          ? `Connected ${edgeName(addedEdges[0]!, nextNodes)}`
          : `Added ${addedEdges.length} connections`,
      group: `connect:${ids(addedEdges)}`,
    };
  }
  if (removedEdges.length) {
    return {
      label:
        removedEdges.length === 1
          ? `Removed connection ${edgeName(removedEdges[0]!, prevNodes)}`
          : `Removed ${removedEdges.length} connections`,
      group: `disconnect:${ids(removedEdges)}`,
    };
  }
  const changedEdge = after.edges.find((edge) => !same(edge, prevEdges.get(edge.id)));
  if (changedEdge) {
    return { label: `Edited connection ${edgeName(changedEdge, nextNodes)}`, group: `edge:${changedEdge.id}` };
  }
  if (!same(before.meta, after.meta)) return { label: "Updated tags and flows", group: "meta" };
  return { label: "Changed diagram", group: "other" };
}

export function snapshotsEqual(left: DiagramSnapshot, right: DiagramSnapshot) {
  return same(left, right);
}
