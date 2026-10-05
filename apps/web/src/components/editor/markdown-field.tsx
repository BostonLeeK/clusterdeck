"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Label, Textarea } from "@/components/ui/input";

export function MarkdownField({
  label,
  value,
  onChange,
  mode = "preview",
  placeholder,
}: {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  mode?: "edit" | "preview";
  placeholder?: string;
}) {
  return (
    <div className="mt-3 space-y-1.5">
      {label ? <Label>{label}</Label> : null}
      {mode === "edit" ? (
        <Textarea
          className="min-h-36 font-mono text-[13px] leading-5"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
        <div className="markdown-body min-h-0 rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 py-2">
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-sm text-zinc-600">No description</p>
          )}
        </div>
      )}
    </div>
  );
}
