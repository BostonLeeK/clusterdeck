"use client";

import type { ReactNode } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Menu = Dropdown.Root;
export const MenuTrigger = Dropdown.Trigger;

export function MenuContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        className={cn(
          "z-50 min-w-40 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl",
          className,
        )}
        sideOffset={6}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof Dropdown.Item>) {
  return (
    <Dropdown.Item
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none hover:bg-white/5",
        className,
      )}
      {...props}
    />
  );
}
