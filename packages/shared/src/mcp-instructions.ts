import { CATEGORY_LABELS, NODE_CATEGORIES, NODE_LIBRARY, TECH_CATALOG } from "./node-types";

export function diagramAgentInstructions(): string {
  const types = NODE_CATEGORIES.map((category) => {
    const items = NODE_LIBRARY.filter((item) => item.category === category)
      .map((item) => `${item.id} (${item.label}, default scope ${item.defaultScope})`)
      .join(", ");
    return `${CATEGORY_LABELS[category]}: ${items}`;
  }).join("\n");
  const technologies = TECH_CATALOG.map((item) => item.id).join(", ");

  return [
    "ClusterDeck stores infrastructure diagrams. Each diagram has nodes and edges on a shared canvas.",
    "Read a diagram with get_diagram, then change it with update_diagram. Use list_diagrams to find ids.",
    "MCP access is off for every diagram until someone enables it. list_diagrams returns only enabled diagrams. Anything else is not found.",
    "Only use the type ids, shapes, and technology ids listed here.",
    "",
    "Node kinds:",
    "- infra: a component. Requires typeId. Fields: title, subtitle, description, displayDescription, tags, technologies, status (healthy|degraded|unknown|offline), shape (rounded|rectangle|cylinder|hexagon|actor|stadium), scope (internal|external), lifecycle (live|future|deprecated|removed).",
    "- group: a container. Children use parentId and positions relative to the group's top-left. Fields: title, subtitle, tags.",
    "- note: title, body, tone (text|comment).",
    "- port: a small connector. Fields: title, direction (in|out), protocol, parentNodeId, parentEdgeId.",
    "",
    "Every node has id, position {x, y}, and optional width, height, parentId.",
    "A new node needs position. Omit id to create one. Sending an existing id updates that node and keeps fields you omit, including properties.",
    "External scope and future lifecycle render as a dashed outline.",
    "",
    "Infra type ids:",
    types,
    "",
    `Technology ids: ${technologies}`,
    "",
    "Edges connect node ids. Fields: id, source, target, label, animated (dashed motion), lineShape (bezier|straight|step).",
    "A new edge needs source and target. Omit id to create one.",
    "update_diagram deletes by id. Edges whose endpoints were removed are dropped.",
    "Child diagrams are separate documents. parentDiagramId on list_diagrams points at the parent diagram.",
  ].join("\n");
}
