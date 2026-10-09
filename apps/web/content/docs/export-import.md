---
title: Export & import
description: Move diagrams as JSON bundles or draw.io files.
---

Export and import let you back up diagrams, move them between environments, or bring work in from draw.io / diagrams.net.

## Formats at a glance

| Format | Export | Import | Nested children |
| --- | --- | --- | --- |
| **JSON bundle** | Yes | Yes | Included |
| **draw.io** (`.drawio`) | Yes | Yes | Current diagram only |
| **Excalidraw** | Yes | No | Current diagram only |
| **PNG / SVG** | Yes | No | Current view |

Open the editor **Export** menu for all of these.

## JSON bundle (full tree)

### Export

ClusterDeck downloads a **JSON bundle** that includes:

- The root diagram (nodes, edges, meta)
- **All nested child diagrams** linked via `childDiagramId`
- Enough structure to re-import the full tree

### Import

1. **Export → Import JSON** in the editor, or use the Projects create/import flow when available.
2. Choose the `.json` bundle.
3. Confirm — nested drill-down is restored.

Import creates new diagram ids as needed while preserving internal parent/child links inside the bundle.

Conceptual shape:

```json
{
  "rootId": "…",
  "diagrams": [
    { "id": "…", "name": "…", "nodes": [], "edges": [], "meta": {} }
  ]
}
```

## draw.io

### Export draw.io

**Export → Export draw.io** downloads the **current** diagram as `.drawio` XML for diagrams.net.

- Nodes become shapes with titles / subtitles
- Edges keep labels and basic routing style
- Nested child diagrams are **not** embedded — export each level separately, or use JSON for the full tree

### Import draw.io

**Export → Import draw.io** accepts `.drawio`, `.dio`, or mxfile `.xml` from diagrams.net.

What gets imported:

- Vertices → ClusterDeck nodes (infra, groups, notes when detectable)
- Edges → connections with labels and direction when present
- Groups / containers → group nodes with children when parented
- Multiple pages → laid out side by side on one canvas
- Compressed draw.io payloads (common default save format) are decoded automatically

What to expect (best-effort):

- Types are inferred from shape + title keywords (`postgres`, `kafka`, `user`, …) — refine in the inspector after import
- Markdown descriptions, tags, flows, connectors, and nested `childDiagramId` trees are not in draw.io — use **JSON** for those
- Import **replaces** the current diagram snapshot (same as applying a flat import)

Round-trip tip: export from ClusterDeck to draw.io, edit externally, import back — ids prefixed with `df-` round-trip cleanly.

## Nested diagrams

| Action | Nested children |
| --- | --- |
| Export JSON | Included |
| Import JSON | Restored |
| Export / import draw.io | Current diagram only |
| Duplicate (in app) | Copied with the tree |
| Public share | Navigable via token + diagram id |

## Backup strategy

1. Prefer **JSON** before large refactors or ownership transfers (full nested tree).
2. Use **draw.io** when collaborating with people who live in diagrams.net.
3. Keep templates for “golden” starters; keep exports for point-in-time backups.
4. Remember [History](/docs/editor/history) is short-term; exports are long-term.

## Tips

- Sanitize properties (tokens, passwords) before sharing bundles outside the company.
- After JSON import, spot-check connectors and flows — they depend on edge/node ids inside the bundle.
- After draw.io import, review inferred types, groups, and edge directions before sharing as truth.
