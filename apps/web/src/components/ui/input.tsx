import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-primary/70 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-primary/70 focus:ring-2 focus:ring-primary/20",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-zinc-300", className)} {...props} />;
}
