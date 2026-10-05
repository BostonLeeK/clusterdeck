"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconLabel, searchIconifyIcons } from "@/lib/property-icons";

export function IconPicker({
  value,
  disabled,
  onChange,
}: {
  value?: string;
  disabled?: boolean;
  onChange: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void searchIconifyIcons(query).then((icons) => {
        if (cancelled) return;
        setResults(icons);
        setLoading(false);
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const title = useMemo(() => (value ? iconLabel(value) : "Choose icon"), [value]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        title={title}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "grid size-8 place-items-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300",
          "hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
        )}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
          setQuery("");
        }}
      >
        {value ? <Icon icon={value} className="size-4" /> : <Search className="size-3.5 text-zinc-500" />}
      </button>
      {open ? (
        <div className="absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-xl">
          <div className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-2">
            <Search className="size-3.5 shrink-0 text-zinc-500" />
            <input
              id={inputId}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons…"
              className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-600"
            />
            {value ? (
              <button
                type="button"
                className="grid size-6 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-white"
                title="Clear icon"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          <div className="max-h-64 overflow-x-hidden overflow-y-auto overscroll-contain">
            {loading && results.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-zinc-500">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-zinc-500">No icons found</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2rem,1fr))] gap-1">
                {results.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    title={icon}
                    className={cn(
                      "grid aspect-square w-full place-items-center rounded-lg text-zinc-300 hover:bg-white/5 hover:text-white",
                      value === icon && "bg-white/10 text-white",
                    )}
                    onClick={() => {
                      onChange(icon);
                      setOpen(false);
                    }}
                  >
                    <Icon icon={icon} className="size-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
