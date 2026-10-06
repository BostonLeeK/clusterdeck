import type { DiagramSnapshot } from "./node-types";
import type { ExportEdge, ExportNode, ExportShape } from "./export-layout";
import { layoutDiagram } from "./export-layout";

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlEscape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cellId(id: string): string {
  return `df-${id}`;
}

function labelValue(lines: string[]): string {
  const html = lines
    .map((line, index) => {
      const escaped = htmlEscape(line);
      return index === 0 ? `<b>${escaped}</b>` : `<font style="font-size:11px" color="#71717a">${escaped}</font>`;
    })
    .join("<br>");
  return xmlEscape(html);
}

function shapeStyle(shape: ExportShape): string {
  switch (shape) {
    case "rectangle":
      return "rounded=0;whiteSpace=wrap;html=1";
    case "stadium":
      return "rounded=1;arcSize=50;whiteSpace=wrap;html=1";
    case "cylinder":
      return "shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=14;whiteSpace=wrap;html=1";
    case "hexagon":
      return "shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1";
    case "actor":
      return "ellipse;whiteSpace=wrap;html=1";
    case "group":
      return "rounded=1;arcSize=8;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0";
    case "note":
    case "port":
    case "rounded":
      return "rounded=1;arcSize=12;whiteSpace=wrap;html=1";
  }
}

function nodeStyle(node: ExportNode): string {
  const align = node.align === "left" ? "left" : "center";
  const vertical = node.verticalAlign === "top" ? "top" : "middle";
  const parts = [
    shapeStyle(node.shape),
    `fillColor=${node.fill}`,
    `strokeColor=${node.stroke}`,
    "strokeWidth=2",
    "fontFamily=Helvetica",
    "fontSize=13",
    "fontColor=#18181b",
    `align=${align}`,
    `verticalAlign=${vertical}`,
    `opacity=${node.opacity}`,
  ];
  if (node.align === "left") parts.push("spacingLeft=12", "spacingTop=8");
  if (node.dashed) parts.push("dashed=1");
  return parts.join(";");
}

function edgeStyle(edge: ExportEdge): string {
  const parts = [
    "html=1",
    edge.direction === "backward" ? "endArrow=none" : "endArrow=block",
    "endFill=1",
    edge.direction === "forward" ? "startArrow=none" : "startArrow=block",
    "startFill=1",
    "strokeColor=#71717a",
    "fontColor=#3f3f46",
    "fontSize=11",
    "exitX=1",
    "exitY=0.5",
    "exitDx=0",
    "exitDy=0",
    "entryX=0",
    "entryY=0.5",
    "entryDx=0",
    "entryDy=0",
  ];
  if (edge.lineShape === "step") parts.push("edgeStyle=orthogonalEdgeStyle", "rounded=0");
  else if (edge.lineShape === "bezier") parts.push("curved=1");
  if (edge.dashed) parts.push("dashed=1");
  return parts.join(";");
}

function nodeCell(node: ExportNode): string {
  const parent = node.parentId ? cellId(node.parentId) : "1";
  return [
    `<mxCell id="${xmlEscape(cellId(node.id))}" value="${labelValue(node.lines)}" style="${nodeStyle(node)}" vertex="1" parent="${xmlEscape(parent)}">`,
    `<mxGeometry x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" as="geometry"/>`,
    "</mxCell>",
  ].join("");
}

export function toDrawio(snapshot: DiagramSnapshot): string {
  const { nodes, edges } = layoutDiagram(snapshot);
  const cells = [
    `<mxCell id="0"/>`,
    `<mxCell id="1" parent="0"/>`,
    ...nodes.map(nodeCell),
    ...edges.map(
      (edge) =>
        `<mxCell id="${xmlEscape(cellId(edge.id))}" value="${xmlEscape(edge.label ?? "")}" style="${edgeStyle(edge)}" edge="1" parent="1" source="${xmlEscape(cellId(edge.sourceId))}" target="${xmlEscape(cellId(edge.targetId))}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    ),
  ];
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<mxfile host="app.diagrams.net" agent="ClusterDeck" version="24.0.0" type="device">`,
    `<diagram id="diagram" name="Diagram">`,
    `<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="1169" pageHeight="827" math="0" shadow="0">`,
    `<root>`,
    ...cells,
    `</root>`,
    `</mxGraphModel>`,
    `</diagram>`,
    `</mxfile>`,
  ].join("");
}
