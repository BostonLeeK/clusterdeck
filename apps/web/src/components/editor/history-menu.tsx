"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { getDiagramHistoryEntry, listDiagramHistory } from "@/actions/diagrams";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { HISTORY_LIMIT, useHistory } from "@/lib/history";
import type { DiagramSnapshot } from "@dataflow/shared";

function timeAgo(at: number, now: number) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return new Date(at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type ServerEntry = {
  id: string;
  label: string;
  at: number;
  userName: string | null;
};

export function HistoryMenu({
  diagramId,
  readOnly,
  onRestoreLocal,
  onRestoreSnapshot,
}: {
  diagramId: string;
  readOnly: boolean;
  onRestoreLocal: (entryId: string) => void;
  onRestoreSnapshot: (snapshot: DiagramSnapshot, label: string) => void;
}) {
  const history = useHistory(diagramId);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [serverEntries, setServerEntries] = useState<ServerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const sessionEntries = history.entries.slice().reverse();

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void listDiagramHistory(diagramId)
      .then((rows) => {
        if (!cancelled) setServerEntries(rows);
      })
      .catch(() => {
        if (!cancelled) setServerEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [diagramId, open]);

  function toggle(next: boolean) {
    if (next) setNow(Date.now());
    setOpen(next);
  }

  async function restoreServer(entryId: string) {
    if (readOnly || restoringId) return;
    setRestoringId(entryId);
    try {
      const entry = await getDiagramHistoryEntry(diagramId, entryId);
      onRestoreSnapshot(entry.snapshot, entry.label);
      toast("Restored saved version", "success");
    } catch {
      toast("Couldn’t restore version", "error");
    } finally {
      setRestoringId(null);
    }
  }

  const badge = serverEntries.length || history.entries.length;

  return (
    <Menu open={open} onOpenChange={toggle}>
      <MenuTrigger asChild>
        <button
          type="button"
          title="History"
          className="relative grid size-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
        >
          <History className="size-4" />
          {badge ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[9px] leading-4 text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </button>
      </MenuTrigger>
      <MenuContent className="w-80 p-1.5">
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          <span className="text-xs font-medium text-zinc-300">History</span>
          <span className="text-[11px] text-zinc-600">Saved versions</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="px-2 py-4 text-center text-xs text-zinc-600">Loading…</p>
          ) : serverEntries.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-zinc-600">No saved versions yet</p>
          ) : (
            serverEntries.map((entry, index) => (
              <MenuItem
                key={entry.id}
                disabled={readOnly || restoringId === entry.id}
                className="items-start gap-2 data-[disabled]:cursor-default"
                onSelect={() => void restoreServer(entry.id)}
              >
                <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-zinc-200">{entry.label}</span>
                  <span className="block text-[11px] text-zinc-500">
                    {index === 0 ? `Latest · ${timeAgo(entry.at, now)}` : timeAgo(entry.at, now)}
                    {entry.userName ? ` · ${entry.userName}` : ""}
                  </span>
                </span>
              </MenuItem>
            ))
          )}

          {sessionEntries.length ? (
            <>
              <div className="mt-2 flex items-center justify-between border-t border-[#2a2a2e] px-2 pt-2 pb-1">
                <span className="text-[11px] font-medium text-zinc-500">This tab</span>
                <span className="text-[11px] text-zinc-600">Last {HISTORY_LIMIT}</span>
              </div>
              {sessionEntries.map((entry, index) => (
                <MenuItem
                  key={entry.id}
                  disabled={readOnly || index === 0}
                  className="items-start gap-2 data-[disabled]:cursor-default"
                  onSelect={() => onRestoreLocal(entry.id)}
                >
                  <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-zinc-200">{entry.label}</span>
                    <span className="block text-[11px] text-zinc-500">
                      {index === 0 ? "Current" : timeAgo(entry.at, now)}
                    </span>
                  </span>
                </MenuItem>
              ))}
              {history.base ? (
                <MenuItem disabled={readOnly} className="items-start gap-2" onSelect={() => onRestoreLocal("base")}>
                  <RotateCcw className="mt-0.5 size-3.5 shrink-0 text-zinc-500" />
                  <span className="text-[13px] text-zinc-400">Session start</span>
                </MenuItem>
              ) : null}
            </>
          ) : null}
        </div>
      </MenuContent>
    </Menu>
  );
}
