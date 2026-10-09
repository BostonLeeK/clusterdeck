---
title: Groups & containers
description: Frame related nodes and nest layout inside groups.
---

Groups are frames that visually and structurally contain other nodes. Use them for bounded contexts, VPCs, clusters, or “team ownership” boxes.

## Create a group

1. Add a **group** from the palette, or
2. Select nodes and use a “group selection” action when available.

Resize the frame so children sit inside it.

## Parent / child positioning

Nodes inside a group use **parentId** and positions relative to the group’s top-left. Moving the group moves its children with it.

Detach a node by clearing its parent (move it out of the frame according to editor gestures).

## Groups vs nested diagrams

| | Group | Nested diagram |
| --- | --- | --- |
| Same canvas? | Yes | No — separate diagram |
| Best for | Layout / visual clustering | Deep subsystem detail |
| Drill-down URL / share | N/A | Supported via child diagram id |

Use **groups** for “these boxes belong together.” Use **nested diagrams** when the subsystem needs its own full canvas, history, and connectors.

## Group metadata

Groups can carry title, subtitle, description, tags, and connectors (same publish idea as infra nodes when they have an inner diagram).

## Tips

- Do not over-nest groups three or four levels deep on one canvas — prefer a child diagram.
- Align group titles with real boundaries (account, namespace, product area).
- Keep padding inside the frame so edges remain readable.
