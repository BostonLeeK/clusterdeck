"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
  title?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
  size = "md",
  variant = "labeled",
  stretch = false,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  variant?: "labeled" | "icons";
  stretch?: boolean;
}) {
  const iconsOnly = variant === "icons";
  const fill = !iconsOnly || stretch;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-0.5 rounded-xl border border-[#2a2a2e] bg-[#121214] p-0.5",
        fill ? "w-full" : "w-fit",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            title={option.title ?? option.label}
            aria-label={option.label}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg text-[11px] font-medium capitalize transition",
              iconsOnly && !stretch
                ? size === "sm"
                  ? "size-8 shrink-0"
                  : "size-9 shrink-0"
                : cn("min-w-0 flex-1", size === "sm" ? "h-8 px-2.5" : "h-9 px-3"),
              active ? "bg-[#1c1c1f] text-white" : "text-zinc-500 hover:text-zinc-300",
              disabled && "cursor-not-allowed opacity-50",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {!iconsOnly ? <span className="truncate">{option.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
