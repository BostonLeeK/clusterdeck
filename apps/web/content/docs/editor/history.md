---
title: History
description: Browse and restore earlier saved versions of a diagram.
---

Server-side **history** keeps recent snapshots of a diagram so you can recover from mistakes or compare earlier states.

## Open history

In the editor top bar, open **History**. You will see a list of versions (timestamps / authors when available).

Retention is limited (on the order of ~100 recent entries per diagram). History is not a full audit archive forever — export if you need long-term backups.

## Restore a version

1. Open **History**.
2. Preview or select the version you want.
3. Confirm **Restore**.

Restoring replaces the current diagram content with that snapshot. Collaborators will see the restored state through realtime sync.

## What history covers

- Nodes, edges, and diagram meta for **that** diagram id
- Nested children are separate diagrams — each has its own history

If you need to rewind an entire tree, restore parent and relevant children deliberately (or re-import a bundle).

## History vs undo

| | Local undo | Server history |
| --- | --- | --- |
| Scope | Current session edits | Persisted snapshots |
| Survives reload | No | Yes |
| Multiplayer | Limited | Shared recovery point |

Use undo for small slips; use history for “yesterday’s diagram” or after bad multiplayer edits.

## Tips

- Restore carefully on shared production architecture docs — announce in chat if others are editing.
- Export a bundle before a risky restore if you might want the pre-restore state again.
- Do not treat history as compliance storage; retention is capped.
