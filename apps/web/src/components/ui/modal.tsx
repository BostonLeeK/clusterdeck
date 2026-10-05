"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;

export function ModalContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
      <Dialog.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[min(480px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#2a2a2e] bg-[#161618] p-5 shadow-2xl",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                {description}
              </Dialog.Description>
            ) : (
              <Dialog.Description className="sr-only">{title}</Dialog.Description>
            )}
          </div>
          <Dialog.Close className="rounded-md p-1 text-zinc-400 hover:bg-white/5 hover:text-white">
            <X className="size-4" />
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
