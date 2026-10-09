---
title: Canvas overview
description: How the diagram editor is laid out and how editing works.
---

The editor is an infinite canvas for nodes and edges, with toolbars for palette, properties, sharing, history, and export.

## Layout

Typical chrome:

- **Top bar** — diagram name, share, export, history, presence
- **Left / palette** — node types to add
- **Canvas** — pan, zoom, select, connect
- **Inspector** — properties for the selected node/edge (title, tags, connectors, child diagram, etc.)
- **Minimap / controls** — zoom and fit (when enabled)

## Navigation

- **Pan** — drag the background (or use trackpad / middle mouse, depending on bindings)
- **Zoom** — scroll / pinch / zoom controls
- **Select** — click a node or edge; shift/cmd for multi-select where supported
- **Open nested diagram** — drill into a node that has a child diagram

See [Keyboard shortcuts](/docs/editor/shortcuts).

## Edit loop

1. Add nodes from the palette.
2. Position and title them.
3. Draw edges between handles / connectors.
4. Group related nodes.
5. Attach child diagrams for subsystems.
6. Tag nodes and define flows for storytelling.
7. Share or export when ready.

Changes persist for authorized users and sync in realtime — see [Realtime](/docs/collaboration).

## Selection and properties

Selecting an element opens its properties:

- Title, subtitle, description
- Type / shape / accent (for infra-style nodes)
- Tags, technologies, status
- Connectors (published handles for nested content)
- Child diagram link

Edges expose label, direction, line shape, and handles.

## Autosave and conflict

Realtime collaboration merges concurrent edits. Prefer short editing sessions on the same region of a large diagram when many people are online. Use [History](/docs/editor/history) if you need to roll back.

## Related

- [Nodes](/docs/editor/nodes)
- [Edges & connectors](/docs/editor/edges)
- [Groups & containers](/docs/editor/groups)
- [Nested diagrams](/docs/editor/nested)
- [Tags & flows](/docs/editor/tags-flows)
