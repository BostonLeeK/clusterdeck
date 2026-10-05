import { Box } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-indigo-500/15 text-indigo-400">
        <Box className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">DataFlow</span>
    </span>
  );
}
