import {
  applyEditsToSnapshot,
  applySnapshot,
  snapshotFromDoc,
  type DiagramEdits,
  type EdgeInput,
  type NodeInput,
} from "@dataflow/shared";
import type * as Y from "yjs";

export type { DiagramEdits, EdgeInput, NodeInput };

export function applyDiagramEdits(
  doc: Y.Doc,
  edits: DiagramEdits,
): { upsertedNodeIds: string[]; deletedNodeIds: string[]; upsertedEdgeIds: string[]; deletedEdgeIds: string[] } {
  const result = applyEditsToSnapshot(snapshotFromDoc(doc), edits);
  applySnapshot(doc, result.snapshot);
  return {
    upsertedNodeIds: result.upsertedNodeIds,
    deletedNodeIds: result.deletedNodeIds,
    upsertedEdgeIds: result.upsertedEdgeIds,
    deletedEdgeIds: result.deletedEdgeIds,
  };
}
