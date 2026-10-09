---
title: Tags & flows
description: Label nodes and highlight named paths across the canvas.
---

Tags and flows help you tell stories on top of a static architecture map.

## Tags

Tags are string labels on nodes (and sometimes groups). Use them for:

- Environment (`prod`, `staging`)
- Domain (`payments`, `identity`)
- Criticality (`tier-0`)
- Perspective filters in the UI

**Tag definitions** (`tagDefs`) can assign colors so chips stay consistent across the diagram.

### Tips

- Agree on a small vocabulary in team templates.
- Prefer tags for cross-cutting concerns; prefer node type for “what it is.”

## Flows

A **flow** is a named path: an id, display name, color, and a list of edge ids. Activating a flow highlights those edges so viewers can follow a journey (e.g. “Checkout request path”, “Async fraud check”).

### Create a flow

1. Open diagram meta / flows UI.
2. Name the flow and pick a color.
3. Select the edges that belong to the path.
4. Toggle the flow to present it.

### Tips

- One flow = one narrative. Do not overload a single flow with every edge.
- Combine with animated edges on the primary hop only.
- Keep flow names audience-friendly (`User login`) not internal ticket ids.

## Tags + flows together

Example presentation:

1. Filter or emphasize `tier-0` tags.
2. Turn on the “Checkout” flow.
3. Drill into a nested diagram for the payment service.

That sequence works well in reviews and incident walkthroughs.
