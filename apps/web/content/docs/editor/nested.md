---
title: Nested diagrams
description: Drill into child diagrams, publish connectors, and export full trees.
---

Nested diagrams are ClusterDeck’s main way to handle complexity: a node on a parent canvas can open a full child diagram of its internals.

## Mental model

```
Root diagram
├── Checkout API  → child diagram (services, DBs, queues)
├── Identity      → child diagram
└── Edge CDN      (leaf — no child)
```

Each child is a real diagram (own nodes/edges/meta), linked from the parent via `childDiagramId`.

## Create / open a child

1. Select a node on the parent.
2. Use **Open diagram** / create child (inspector or node action).
3. Edit the child canvas like any other diagram.
4. Navigate back to the parent when finished.

Breadcrumbs or back controls keep orientation in deep trees.

## Public share drill-down

Public links support nested navigation: viewers can open child diagrams under `/p/[token]/[diagramId]` without edit access. See [Sharing](/docs/sharing).

## Connectors across levels

Publish inner nodes as parent handles so edges on the parent attach to meaningful ports. Details in [Edges & connectors](/docs/editor/edges).

## Export and import

JSON **bundles** include the root and **all nested children**. Import restores the tree. Partial exports that omit children break drill-down — always use the product Export action. See [Export & import](/docs/export-import).

## History

Server history is per diagram. Restoring a parent does not automatically rewrite every child’s timeline; treat nested docs as a tree of versions when auditing.

## Best practices

- One responsibility per child diagram.
- Keep the parent as a map; put implementation detail in children.
- Publish only the few connectors outsiders need.
- Name child diagrams after the parent node for clarity in lists and exports.
- Avoid cycles (A child of B child of A).
