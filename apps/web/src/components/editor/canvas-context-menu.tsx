"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type CanvasMenuState =
  | {
      kind: "pane";
      clientX: number;
      clientY: number;
      flow: { x: number; y: number };
    }
  | {
      kind: "node";
      clientX: number;
      clientY: number;
      nodeId: string;
      nodeIds: string[];
      nodeType?: string;
    }
  | {
      kind: "edge";
      clientX: number;
      clientY: number;
      edgeId: string;
    };

export function CanvasContextMenu({
  menu,
  onClose,
  children,
}: {
  menu: CanvasMenuState | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onPointer(event: MouseEvent) {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [menu, onClose]);

  if (!menu || typeof document === "undefined") return null;

  const left = Math.min(menu.clientX, window.innerWidth - 220);
  const top = Math.min(menu.clientY, window.innerHeight - 280);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-[100] min-w-[200px] rounded-xl border border-[#2a2a2e] bg-[#161618] p-1 shadow-2xl"
      style={{ left, top }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function ContextMenuItem({
  children,
  onSelect,
  disabled,
  danger,
  shortcut,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] outline-none",
        disabled
          ? "cursor-not-allowed text-zinc-600"
          : danger
            ? "text-red-300 hover:bg-red-500/10"
            : "text-zinc-200 hover:bg-white/5",
      )}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
      }}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {shortcut ? <span className="text-[11px] text-zinc-600">{shortcut}</span> : null}
    </button>
  );
}

export function ContextMenuSeparator() {
  return <div className="my-1 h-px bg-[#2a2a2e]" />;
}

export function ContextMenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1 text-[11px] tracking-wide text-zinc-500 uppercase">{children}</div>;
}
