---
title: Overview
description: What ClusterDeck is and how the product is organized.
---

ClusterDeck is a collaborative diagramming workspace for infrastructure, systems, and data flows. You design diagrams on an infinite canvas, nest diagrams inside nodes, collaborate in realtime, and share or export the result.

## Product map

| Area | What you do there |
| --- | --- |
| **Projects** | Create, open, rename, duplicate, and organize projects |
| **Editor** | Build nodes, edges, groups, nested diagrams, tags, and flows |
| **Teams** | Invite people, manage roles, transfer ownership, delete teams |
| **Sharing** | Invite collaborators or publish a public read-only link |
| **Templates** | Reuse starter projects and save your own |
| **Export / Import** | JSON bundles (full nested tree) and draw.io export/import |
| **History** | Restore earlier saved versions of a diagram |
| **AI** | Generate a first draft from a prompt |
| **MCP** | Automate diagram updates from external tools |

## Who it is for

- Platform / SRE / DevOps teams mapping real systems
- Architects documenting services, data stores, and integrations
- Product teams sharing system context without edit access (public share)
- Anyone who needs nested “drill-down” diagrams instead of one flat canvas

## Core concepts

**Project** — a named unit in your workspace. Opening it loads the root diagram (and its nested tree).

**Diagram** — a named canvas with nodes, edges, and metadata (tags, flows). Projects have a root diagram; nodes can own **child diagrams**.

**Node** — a visual element (app, database, note, group, etc.). Nodes can own a **child diagram** for drill-down.

**Edge** — a connection between nodes, optionally via published **connectors**.

**Team** — a shared workspace with members and roles (owner, admin, member).

**Bundle** — a JSON export that includes a root diagram and all nested children.

## Suggested reading order

1. [Getting started](/docs/getting-started) — create an account and first diagram  
2. [Projects](/docs/projects) — organize your workspace  
3. [Canvas overview](/docs/editor) — learn the editor  
4. [Nested diagrams](/docs/editor/nested) — the main differentiator  
5. [Sharing](/docs/sharing) and [Export & import](/docs/export-import) — collaborate and move data
