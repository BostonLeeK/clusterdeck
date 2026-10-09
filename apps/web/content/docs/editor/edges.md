---
title: Edges & connectors
description: Connect nodes, label traffic, and use published handles.
---

Edges show relationships: network calls, data pipelines, trust boundaries, or logical dependencies.

## Create an edge

1. Hover a node until connection handles appear (or use the connect tool).
2. Drag from a source handle to a target handle.
3. Adjust label, direction, and line shape in the inspector.

## Edge fields

| Field | Meaning |
| --- | --- |
| **label** | Forward caption (e.g. `HTTPS`, `events`) |
| **reverseLabel** | Caption for the opposite direction when bidirectional |
| **direction** | `forward`, `backward`, or `both` |
| **lineShape** | `bezier`, `straight`, or `step` |
| **animated** | Optional motion to emphasize a path |
| **sourceHandle / targetHandle** | Specific ports or published connectors |

Two edges between the same pair of nodes can coexist (drawn as separate arcs).

## Connectors (published handles)

When a node has an **inner / child diagram**, you can **publish** inner nodes as extra in/out handles on the parent card.

Typical workflow:

1. Open the child diagram.
2. Identify the service/node that should be the external contact point.
3. On the parent, set **connectors** referencing that inner `nodeId`, with title and direction (`in` / `out`).
4. Wire edges to handles like `in:<nodeId>` / `out:<nodeId>`.

This keeps the parent diagram clean while still showing precise attachment points.

## Modeling tips

- Prefer **direction both** + reverseLabel for request/response pairs instead of two unlabeled arrows.
- Name labels after protocols or data (`gRPC`, `CDC`, `webhooks`), not vague verbs alone.
- Use animated edges sparingly for the primary narrative path; combine with [Flows](/docs/editor/tags-flows).
- Delete edges that no longer reflect reality — outdated arrows are worse than missing ones.
