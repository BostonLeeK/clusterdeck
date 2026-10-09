---
title: Realtime
description: Edit diagrams together with live sync and presence.
---

ClusterDeck syncs diagram edits in realtime so multiple people can work on the same canvas.

## How it feels

- Presence avatars, live cursors, and chat update while you are connected.
- Node moves, property edits, and edge changes appear for others without a manual refresh.
- Nested diagrams are separate sessions — open the same child to collaborate inside it.
- If status shows **Connecting**, check that the realtime WebSocket URL is reachable.

## Under the hood (conceptual)

The editor uses a CRDT-style collaboration layer (Yjs) with a realtime relay (Hocuspocus). You do not configure this as an end user; it runs when you open a diagram you can access.

## Good collaboration habits

- Agree who owns structure (node layout) vs who fills properties.
- Avoid two people renaming the same node simultaneously.
- Use comments/notes for decisions; use history if something goes wrong.
- For reviews, prefer a presenter + viewers on a [public share](/docs/sharing) when guests should not edit.

## Permissions

Realtime edit only works for users with edit access (owner, team member, or invited collaborator). Public share viewers are read-only and do not join the edit session.

## Offline / reconnect

If the network drops, reconnect and confirm your latest edits. If something looks wrong, check [History](/docs/editor/history) before redrawing large sections.
