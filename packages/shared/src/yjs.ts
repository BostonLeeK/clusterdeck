import * as Y from "yjs";
import type {
  DiagramEdge,
  DiagramMeta,
  DiagramNode,
  DiagramSnapshot,
  DiagramFlow,
  TagDef,
} from "./node-types";
import { emptyMeta } from "./node-types";

export const Y_NODES = "nodes";
export const Y_EDGES = "edges";
export const Y_META = "meta";

export function getNodeMap(doc: Y.Doc): Y.Map<DiagramNode> {
  return doc.getMap(Y_NODES);
}

export function getEdgeMap(doc: Y.Doc): Y.Map<DiagramEdge> {
  return doc.getMap(Y_EDGES);
}

export function getMetaMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(Y_META);
}

export function metaFromDoc(doc: Y.Doc): DiagramMeta {
  const meta = getMetaMap(doc);
  const tagDefs = meta.get("tagDefs");
  const flows = meta.get("flows");
  return {
    tagDefs: Array.isArray(tagDefs) ? (tagDefs as TagDef[]) : [],
    flows: Array.isArray(flows) ? (flows as DiagramFlow[]) : [],
  };
}

export function applyMeta(doc: Y.Doc, next: DiagramMeta, origin?: unknown): void {
  const meta = getMetaMap(doc);
  doc.transact(() => {
    meta.set("tagDefs", next.tagDefs);
    meta.set("flows", next.flows);
  }, origin);
}

export function snapshotFromDoc(doc: Y.Doc): DiagramSnapshot {
  return {
    nodes: Array.from(getNodeMap(doc).values()),
    edges: Array.from(getEdgeMap(doc).values()),
    meta: metaFromDoc(doc),
  };
}

export function applySnapshot(doc: Y.Doc, snapshot: DiagramSnapshot, origin?: unknown): void {
  const nodes = getNodeMap(doc);
  const edges = getEdgeMap(doc);
  const meta = getMetaMap(doc);
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
    const nextMeta = snapshot.meta ?? emptyMeta();
    meta.set("tagDefs", nextMeta.tagDefs);
    meta.set("flows", nextMeta.flows);
  }, origin);
}

export function emptySnapshot(): DiagramSnapshot {
  return { nodes: [], edges: [], meta: emptyMeta() };
}
