"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { HISTORY_LIMIT, useHistory } from "@/lib/history";

function timeAgo(at: number, now: number) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function HistoryMenu({
  diagramId,
  readOnly,
  onRestore,
}: {
  diagramId: string;
  readOnly: boolean;
  onRestore: (entryId: string) => void;
}) {
  const history = useHistory(diagramId);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const entries = history.entries.slice().reverse();

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [open]);

  function toggle(next: boolean) {
    if (next) setNow(Date.now());
    setOpen(next);
  }

  return (
    <Menu open={open} onOpenChange={toggle}>
      <MenuTrigger asChild>
        <button
          type="button"
          title="History"
          className="relative grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <History className="size-4" />
          {history.entries.length ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[9px] leading-4 text-white">
              {history.entries.length}
            </span>
          ) : null}
        </button>
      </MenuTrigger>
      <MenuContent className="w-80 p-1.5">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <span className="text-xs font-medium text-zinc-300">History</span>
          <span className="text-[11px] text-zinc-600">
            Last {HISTORY_LIMIT} in this tab
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {entries.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-zinc-600">No changes yet</p>
          ) : (
            entries.map((entry, index) => (
              <MenuItem
                key={entry.id}
                disabled={readOnly || index === 0}
                className="items-start gap-2 data-[disabled]:cursor-default"
                onSelect={() => onRestore(entry.id)}
              >
                <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-zinc-200">{entry.label}</span>
                  <span className="block text-[11px] text-zinc-500">
                    {index === 0 ? "Current" : timeAgo(entry.at, now)}
                  </span>
                </span>
              </MenuItem>
            ))
          )}
          {history.base && entries.length ? (
            <MenuItem disabled={readOnly} className="items-start gap-2" onSelect={() => onRestore("base")}>
              <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
              <span className="text-[13px] text-zinc-400">Session start</span>
            </MenuItem>
          ) : null}
        </div>
      </MenuContent>
    </Menu>
  );
}
