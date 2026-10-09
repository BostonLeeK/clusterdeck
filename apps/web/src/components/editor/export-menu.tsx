"use client";

import { useRef } from "react";
import { toPng, toSvg } from "html-to-image";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { exportDiagramBundle, importDiagramJson } from "@/actions/diagrams";
import { toDrawio, toExcalidraw, type DiagramSnapshot } from "@dataflow/shared";

export function ExportMenu({
  diagramId,
  getSnapshot,
  onImport,
}: {
  diagramId: string;
  getSnapshot: () => DiagramSnapshot;
  onImport: (snapshot: DiagramSnapshot) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

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
      const bundle = await exportDiagramBundle(diagramId, getSnapshot());
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

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const snapshot = await importDiagramJson(diagramId, parsed as never);
      onImport(snapshot);
      toast("Diagram imported (including nested diagrams)", "success");
    } catch {
      toast("Couldn’t import JSON", "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => void onFileChange(event.target.files?.[0])}
      />
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
          <MenuItem
            onSelect={(event) => {
              event.preventDefault();
              fileRef.current?.click();
            }}
          >
            Import JSON
          </MenuItem>
        </MenuContent>
      </Menu>
    </>
  );
}
