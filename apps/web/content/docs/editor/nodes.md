---
title: Nodes
description: Node types, properties, and how to place them on the canvas.
---

Nodes are the building blocks of a diagram. Each node has a type, visual style, and optional metadata.

## Add a node

1. Pick a type from the palette.
2. Drop or click to place it on the canvas.
3. Edit its title and properties in the inspector.

## Common kinds

| Kind | Role |
| --- | --- |
| **Infra / component** | Apps, services, databases, queues, gateways, etc. |
| **Group** | Frame that contains other nodes |
| **Note** | Free text / comment on the canvas |
| **Port** | Link stub / inherited connection point |

Infra nodes often carry:

- `typeId` (app, postgres, kafka, …)
- Technologies (tags from a catalog)
- Status (healthy, degraded, …)
- Scope (internal / external)
- Lifecycle (live / future / deprecated / removed)
- Accent color
- Properties (key/value facts, optionally shown on canvas)
- Connectors (published in/out handles from a child diagram)

## Properties that matter

**Title** — primary label on the card.

**Subtitle / description** — extra context; description may support markdown in the inspector.

**displayDescription** — short caption on the canvas when you do not want the full description.

**Tags** — freeform labels used with filters and perspectives.

**Technologies** — catalog IDs (e.g. `postgres`, `kubernetes`) for consistent icons/labels.

**Properties** — structured facts:

- `key` / `value` (e.g. OS → Linux, IP → 10.0.0.1)
- `showOnCanvas` — show or keep inspector-only
- optional icon id

**Child diagram** — opens a nested canvas; see [Nested diagrams](/docs/editor/nested).

## Visual style

Use shape, accent, and lifecycle to encode meaning:

- Dashed / muted styles often mean external, future, or deprecated
- Status colors communicate health without opening the inspector
- Keep accents consistent across a team template

## Editing tips

- Prefer stable titles (`Checkout API`) over temporary ones (`tmp1`).
- Put environment-specific facts in properties, not in the title.
- Use notes for decisions; use infra nodes for systems.
- Multi-select and align when cleaning a messy layout.
