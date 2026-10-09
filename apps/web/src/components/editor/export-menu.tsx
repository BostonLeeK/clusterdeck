"use client";

import { toPng, toSvg } from "html-to-image";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { exportDiagramJson, importDiagramJson } from "@/actions/diagrams";
import { toDrawio, toExcalidraw, type DiagramSnapshot } from "@dataflow/shared";
import { toast } from "@/components/ui/toast";

export function ExportMenu({
  diagramId,
  getSnapshot,
  onImport,
}: {
  diagramId: string;
  getSnapshot: () => DiagramSnapshot;
  onImport: (snapshot: DiagramSnapshot) => void;
}) {
  async function exportImage(kind: "png" | "svg") {
    const node = document.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!node) return;
    const data =
      kind === "png"
        ? await toPng(node, { backgroundColor: "#09090b" })
        : await toSvg(node, { backgroundColor: "#09090b" });
    const link = document.createElement("a");
    link.href = data;
    link.download = `diagram.${kind}`;
    link.click();
  }

  function downloadText(filename: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportJson() {
    try {
      const bundle = await exportDiagramJson(diagramId, getSnapshot());
      downloadText("diagram.json", JSON.stringify(bundle, null, 2), "application/json");
    } catch {
      toast("Couldn’t export JSON", "error");
    }
  }

  function exportDrawio() {
    downloadText("diagram.drawio", toDrawio(getSnapshot()), "application/xml");
  }

  function exportExcalidraw() {
    downloadText("diagram.excalidraw", toExcalidraw(getSnapshot()), "application/json");
  }

  function importJson() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const snapshot = await importDiagramJson(diagramId, JSON.parse(await file.text()));
        onImport(snapshot);
      } catch {
        toast("Couldn’t import JSON", "error");
      }
    };
    input.click();
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8 rounded-lg">
          Export
        </Button>
      </MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={() => void exportImage("png")}>Export PNG</MenuItem>
        <MenuItem onSelect={() => void exportImage("svg")}>Export SVG</MenuItem>
        <MenuItem onSelect={exportDrawio}>Export draw.io</MenuItem>
        <MenuItem onSelect={exportExcalidraw}>Export Excalidraw</MenuItem>
        <MenuItem onSelect={() => void exportJson()}>Export JSON</MenuItem>
        <MenuItem onSelect={importJson}>Import JSON</MenuItem>
      </MenuContent>
    </Menu>
  );
}
