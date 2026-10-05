"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  size = "default",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & { size?: "default" | "sm" }) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-[#2a2a2e] bg-[#121214] text-left text-sm text-zinc-100 outline-none transition-colors",
        "hover:border-zinc-600 focus:border-primary/70 focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-zinc-500",
        size === "sm" ? "h-8 rounded-lg px-2.5 text-xs" : "h-10 px-3",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "z-[80] max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-[#2a2a2e] bg-[#141416] p-1 text-zinc-100 shadow-2xl",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-0.5">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex w-full cursor-pointer items-center rounded-lg py-2 pr-8 pl-2.5 text-sm outline-none select-none",
        "text-zinc-300 focus:bg-white/5 focus:text-white data-[highlighted]:bg-primary data-[highlighted]:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex">
        <Check className="size-3.5" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function FormSelect({
  name,
  defaultValue,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  size = "default",
  id,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  size?: "default" | "sm";
  id?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? value ?? "");
  const current = value ?? internal;

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} readOnly /> : null}
      <Select
        value={current || undefined}
        onValueChange={(next) => {
          setInternal(next);
          onValueChange?.(next);
        }}
      >
        <SelectTrigger id={id} size={size} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
