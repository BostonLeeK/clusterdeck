"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastStore = {
  items: ToastItem[];
  push: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, tone = "default") => {
    const id = nextId++;
    set((state) => ({ items: [...state.items, { id, message, tone }] }));
    window.setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, 2800);
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export function toast(message: string, tone: ToastTone = "default") {
  useToastStore.getState().push(message, tone);
}

export function Toaster() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted || !items.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto rounded-xl border px-3.5 py-2.5 text-sm shadow-lg backdrop-blur",
            item.tone === "success" && "border-emerald-500/30 bg-[#0f1a14]/95 text-emerald-100",
            item.tone === "error" && "border-red-500/30 bg-[#1a1010]/95 text-red-100",
            item.tone === "default" && "border-[#2a2a2e] bg-[#141416]/95 text-zinc-100",
          )}
          onClick={() => dismiss(item.id)}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
