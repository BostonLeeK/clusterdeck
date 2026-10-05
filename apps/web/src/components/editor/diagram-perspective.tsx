"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DiagramFlow, TagDef } from "@dataflow/shared";

export type TagPerspectiveMode = "highlight" | "focus" | "hide";

export type DiagramPerspectiveValue = {
  tagDefs: TagDef[];
  hoveredTag: string | null;
  pinnedTag: string | null;
  tagMode: TagPerspectiveMode;
  activeFlowId: string | null;
  activeFlow: DiagramFlow | null;
  flows: DiagramFlow[];
  flowNodeIds: Set<string>;
  flowEdgeIds: Set<string>;
};

const EMPTY_SET = new Set<string>();

const DEFAULT: DiagramPerspectiveValue = {
  tagDefs: [],
  hoveredTag: null,
  pinnedTag: null,
  tagMode: "highlight",
  activeFlowId: null,
  activeFlow: null,
  flows: [],
  flowNodeIds: EMPTY_SET,
  flowEdgeIds: EMPTY_SET,
};

const DiagramPerspectiveContext = createContext<DiagramPerspectiveValue>(DEFAULT);

export function DiagramPerspectiveProvider({
  value,
  children,
}: {
  value: DiagramPerspectiveValue;
  children: ReactNode;
}) {
  return <DiagramPerspectiveContext.Provider value={value}>{children}</DiagramPerspectiveContext.Provider>;
}

export function useDiagramPerspective() {
  return useContext(DiagramPerspectiveContext);
}
