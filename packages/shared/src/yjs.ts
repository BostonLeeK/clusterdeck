import * as Y from "yjs";
import type { DiagramEdge, DiagramNode, DiagramSnapshot } from "./node-types";

export const Y_NODES = "nodes";
export const Y_EDGES = "edges";

export function getNodeMap(doc: Y.Doc): Y.Map<DiagramNode> {
  return doc.getMap(Y_NODES);
}

export function getEdgeMap(doc: Y.Doc): Y.Map<DiagramEdge> {
  return doc.getMap(Y_EDGES);
}

export function snapshotFromDoc(doc: Y.Doc): DiagramSnapshot {
  return {
    nodes: Array.from(getNodeMap(doc).values()),
    edges: Array.from(getEdgeMap(doc).values()),
  };
}

export function applySnapshot(doc: Y.Doc, snapshot: DiagramSnapshot, origin?: unknown): void {
  const nodes = getNodeMap(doc);
  const edges = getEdgeMap(doc);
  doc.transact(() => {
    const nextNodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const nextEdgeIds = new Set(snapshot.edges.map((edge) => edge.id));
    for (const key of Array.from(nodes.keys())) {
      if (!nextNodeIds.has(key)) nodes.delete(key);
    }
    for (const key of Array.from(edges.keys())) {
      if (!nextEdgeIds.has(key)) edges.delete(key);
    }
    for (const node of snapshot.nodes) {
      nodes.set(node.id, node);
    }
    for (const edge of snapshot.edges) {
      edges.set(edge.id, edge);
    }
  }, origin);
}

export function emptySnapshot(): DiagramSnapshot {
  return { nodes: [], edges: [] };
}
