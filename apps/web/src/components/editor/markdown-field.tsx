"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function MarkdownField({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">(readOnly ? "preview" : "write");

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <div className="flex rounded-lg border border-[#2a2a2e] p-0.5 text-[11px]">
          {!readOnly ? (
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-0.5",
                tab === "write" ? "bg-[#1c1c1f] text-white" : "text-zinc-500",
              )}
              onClick={() => setTab("write")}
            >
              Write
            </button>
          ) : null}
          <button
            type="button"
            className={cn(
              "rounded-md px-2 py-0.5",
              tab === "preview" ? "bg-[#1c1c1f] text-white" : "text-zinc-500",
            )}
            onClick={() => setTab("preview")}
          >
            Preview
          </button>
        </div>
      </div>
      {tab === "write" && !readOnly ? (
        <Textarea
          className="min-h-36 font-mono text-[13px] leading-5"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <div className="markdown-body min-h-36 rounded-xl border border-[#2a2a2e] bg-[#121214] px-3 py-2">
          {value.trim() ? (
            <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
          ) : (
            <p className="text-sm text-zinc-600">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}
