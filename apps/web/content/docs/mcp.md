---
title: MCP
description: Automate ClusterDeck diagrams from external tools via Model Context Protocol.
---

ClusterDeck exposes an **MCP** (Model Context Protocol) surface so assistants and automation can list, read, and update diagrams without clicking through the UI.

## What you can do

Typical MCP capabilities (when enabled for your project):

- **List diagrams** — discover diagram ids and titles
- **Get diagram** — fetch a full snapshot (`nodes`, `edges`, `meta`)
- **Update diagram** — upsert/delete nodes and edges; update meta (tags, flows)
- **Set / list node status** — push or read observed live health (TTL overlay; see [Live status](/docs/live-status))

Use this for:

- Generating or patching architecture from a coding agent
- Keeping diagrams in sync with infra-as-code reviews
- Bulk retitling, tagging, or wiring documented connectors
- Pushing probe results from n8n / cron without rewriting diagram history

## Safety rules

- Prefer **read** (`list` / `get`) before large updates.
- Send only the fields you intend to change; understand that arrays you send (e.g. `properties`, `tags`, `connectors`) **replace** the previous array.
- Do not invent `childDiagramId` — nesting is managed by the product when users open/create child diagrams.
- Never push secrets into node properties via automation.

## Suggested agent workflow

1. `list_diagrams` — find the target id  
2. `get_diagram` — read current nodes/edges  
3. Plan the delta (new nodes, edge rewires, property updates)  
4. `update_diagram` — apply upserts/deletes  
5. `get_diagram` again — verify  

For nested systems: get the parent, then get/update the child diagram by id.

## Enabling access

1. In the workspace account menu, open **MCP token**.
2. Generate a token and copy it once — store it in your MCP client config.
3. Enable MCP **per project** (toggles in the same dialog or in the editor).
4. Point the client at the public MCP URL (for example `https://your-host/mcp`) with:
   `Authorization: Bearer <token>`.

Only projects with MCP enabled appear in `list_diagrams`. Revoke the token from the same dialog if it leaks.

While an agent edits, the editor may show an **MCP agent editing** indicator.

## Related

- [Nested diagrams](/docs/editor/nested) — how trees are modeled  
- [Export & import](/docs/export-import) — offline bundles vs live MCP updates  
- [Nodes](/docs/editor/nodes) / [Edges](/docs/editor/edges) — field meanings agents must respect  
