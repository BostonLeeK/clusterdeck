import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  color,
  children,
}: {
  className?: string;
  color?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300",
        className,
      )}
    >
      {color ? <span className="size-1.5 rounded-full" style={{ background: color }} /> : null}
      {children}
    </span>
  );
}
