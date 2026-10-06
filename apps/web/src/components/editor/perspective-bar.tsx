"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, EyeOff, Focus, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import type { ChatMessage, DiagramEdits, DiagramFlow, DiagramSnapshot, TagDef } from "@dataflow/shared";
import { Avatar } from "@/components/ui/avatar";
import { OpenAiKeySettings } from "@/components/projects/openai-key-settings";
import { useAiDiagramChat } from "@/hooks/use-ai-diagram-chat";
import { cn } from "@/lib/utils";
import type { TagPerspectiveMode } from "@/components/editor/diagram-perspective";

export function PerspectiveBar({
  diagramId,
  getSnapshot,
  applyAiEdits,
  tagDefs,
  flows,
  chat,
  hoveredTag,
  pinnedTag,
  tagMode,
  activeFlowId,
  readOnly,
  onHoverTag,
  onPinTag,
  onTagMode,
  onActiveFlow,
  onCreateFlow,
  onRemoveFlow,
  onRenameFlow,
  onSendChat,
}: {
  diagramId: string;
  getSnapshot: () => DiagramSnapshot;
  applyAiEdits: (edits: DiagramEdits) => unknown;
  tagDefs: TagDef[];
  flows: DiagramFlow[];
  chat: ChatMessage[];
  hoveredTag: string | null;
  pinnedTag: string | null;
  tagMode: TagPerspectiveMode;
  activeFlowId: string | null;
  readOnly: boolean;
  onHoverTag: (tag: string | null) => void;
  onPinTag: (tag: string | null) => void;
  onTagMode: (mode: TagPerspectiveMode) => void;
  onActiveFlow: (id: string | null) => void;
  onCreateFlow: () => void;
  onRemoveFlow: (id: string) => void;
  onRenameFlow: (id: string, name: string) => void;
  onSendChat: (text: string) => void;
}) {
  const [tab, setTab] = useState<"tags" | "flows" | "chat" | "ai">("tags");
  const [draft, setDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const ai = useAiDiagramChat({
    diagramId,
    getSnapshot,
    applyEdits: applyAiEdits,
    readOnly,
  });

  useEffect(() => {
    if (tab !== "chat") return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, tab]);

  useEffect(() => {
    if (tab !== "ai") return;
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ai.messages, tab, ai.pending]);

  return (
    <div className="absolute bottom-14 left-1/2 z-20 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#2a2a2e] bg-[#141416]/95 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-1 border-b border-[#2a2a2e] px-2 py-1.5">
        <TabButton active={tab === "tags"} onClick={() => setTab("tags")}>
          Tags
        </TabButton>
        <TabButton active={tab === "flows"} onClick={() => setTab("flows")}>
          Flows
        </TabButton>
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
          {chat.length ? `Chat · ${chat.length}` : "Chat"}
        </TabButton>
        <TabButton active={tab === "ai"} onClick={() => setTab("ai")}>
          AI
        </TabButton>
        {tab === "tags" ? (
          <div className="ml-auto flex items-center gap-0.5">
            <ModeButton active={tagMode === "highlight"} title="Highlight" onClick={() => onTagMode("highlight")}>
              <Eye className="size-3.5" />
            </ModeButton>
            <ModeButton active={tagMode === "focus"} title="Focus" onClick={() => onTagMode("focus")}>
              <Focus className="size-3.5" />
            </ModeButton>
            <ModeButton active={tagMode === "hide"} title="Hide others" onClick={() => onTagMode("hide")}>
              <EyeOff className="size-3.5" />
            </ModeButton>
          </div>
        ) : tab === "flows" ? (
          <div className="ml-auto">
            {!readOnly ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
                onClick={onCreateFlow}
              >
                <Plus className="size-3.5" /> New flow
              </button>
            ) : null}
          </div>
        ) : tab === "ai" ? (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
              onClick={() => {
                setKeyOpen((open) => !open);
                void ai.refreshKeyStatus();
              }}
            >
              {ai.configured ? "API key" : "Add key"}
            </button>
            {ai.messages.length ? (
              <button
                type="button"
                title="Clear AI thread"
                className="grid size-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                onClick={ai.clearThread}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="ml-auto text-[11px] text-zinc-500">Live for everyone in this diagram</div>
        )}
      </div>

      {tab === "chat" ? (
        <div className="flex h-52 flex-col">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
            {chat.length === 0 ? (
              <p className="text-[11px] text-zinc-500">No messages yet. Say hi to your teammates.</p>
            ) : (
              chat.map((message) => (
                <div key={message.id} className="flex items-start gap-2">
                  <Avatar
                    name={message.name}
                    image={message.image}
                    className="mt-0.5 size-5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-[11px] font-medium text-zinc-200">{message.name}</span>
                      <span className="shrink-0 text-[10px] text-zinc-600">
                        {new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[12px] leading-5 break-words text-zinc-300">{message.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-[#2a2a2e] px-2 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onSendChat(draft);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a message…"
              maxLength={1000}
              className="h-8 min-w-0 flex-1 rounded-lg border border-[#2a2a2e] bg-[#0f0f12] px-2.5 text-[12px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="grid size-8 place-items-center rounded-lg bg-primary text-white disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      ) : tab === "ai" ? (
        <div className="flex h-64 flex-col">
          {keyOpen || !ai.configured ? (
            <div className="border-b border-[#2a2a2e] px-3 py-2.5">
              <OpenAiKeySettings
                onChanged={() => {
                  void ai.refreshKeyStatus();
                }}
              />
              <p className="mt-2 text-[11px] text-zinc-500">
                Uses your OpenAI key. MCP remains for Cursor and other agents.
              </p>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
            {ai.messages.length === 0 ? (
              <div className="flex items-start gap-2 text-[11px] text-zinc-500">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-indigo-300" />
                <p>
                  Ask about this diagram or tell the AI to add, rename, connect, or remove nodes. Edits apply
                  to the canvas and show up in History.
                </p>
              </div>
            ) : (
              ai.messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="text-[10px] font-medium tracking-wide text-zinc-500 uppercase">
                    {message.role === "user" ? "You" : "AI"}
                  </div>
                  {message.role === "assistant" ? (
                    <div className="markdown-body text-[12px] leading-5 text-zinc-300">
                      <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                    </div>
                  ) : (
                    <p className="text-[12px] leading-5 break-words text-zinc-200">{message.content}</p>
                  )}
                </div>
              ))
            )}
            {ai.pending ? <p className="text-[11px] text-zinc-500">Thinking…</p> : null}
            {ai.error ? <p className="text-[11px] text-red-400">{ai.error}</p> : null}
            <div ref={aiEndRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-[#2a2a2e] px-2 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!aiDraft.trim() || ai.pending || readOnly) return;
              const text = aiDraft;
              setAiDraft("");
              void ai.send(text);
            }}
          >
            <input
              value={aiDraft}
              onChange={(event) => setAiDraft(event.target.value)}
              placeholder={
                readOnly
                  ? "View-only"
                  : ai.configured
                    ? "Ask AI to edit this diagram…"
                    : "Add an OpenAI API key first…"
              }
              disabled={readOnly || ai.pending || !ai.configured}
              maxLength={4000}
              className="h-8 min-w-0 flex-1 rounded-lg border border-[#2a2a2e] bg-[#0f0f12] px-2.5 text-[12px] text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-primary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={readOnly || ai.pending || !ai.configured || !aiDraft.trim()}
              className="grid size-8 place-items-center rounded-lg bg-primary text-white disabled:opacity-40"
            >
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex max-h-28 flex-wrap items-center gap-1.5 overflow-auto px-3 py-2.5">
          {tab === "tags" ? (
            tagDefs.length === 0 ? (
              <span className="text-[11px] text-zinc-500">Add tags on a node to build perspectives</span>
            ) : (
              tagDefs.map((tag) => {
                const active = pinnedTag === tag.label || hoveredTag === tag.label;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                      active ? "border-white/30 bg-white/10 text-white" : "border-[#2a2a2e] text-zinc-300 hover:bg-white/5",
                    )}
                    onMouseEnter={() => onHoverTag(tag.label)}
                    onMouseLeave={() => onHoverTag(null)}
                    onClick={() => onPinTag(pinnedTag === tag.label ? null : tag.label)}
                  >
                    <span className="size-2 rounded-full" style={{ background: tag.color }} />
                    {tag.label}
                  </button>
                );
              })
            )
          ) : flows.length === 0 ? (
            <span className="text-[11px] text-zinc-500">Create a flow to highlight a path across edges</span>
          ) : (
            flows.map((flow) => {
              const active = activeFlowId === flow.id;
              return (
                <div
                  key={flow.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]",
                    active ? "border-white/30 bg-white/10" : "border-[#2a2a2e]",
                  )}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full px-1.5 py-0.5 text-zinc-200 hover:text-white"
                    onClick={() => onActiveFlow(active ? null : flow.id)}
                  >
                    <span className="size-2 rounded-full" style={{ background: flow.color }} />
                    <input
                      className="w-24 bg-transparent text-[11px] outline-none"
                      disabled={readOnly}
                      value={flow.name}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onRenameFlow(flow.id, event.target.value)}
                    />
                    <span className="text-zinc-600">{flow.edgeIds.length}</span>
                  </button>
                  {!readOnly ? (
                    <button
                      type="button"
                      className="grid size-5 place-items-center rounded-full text-zinc-600 hover:bg-white/5 hover:text-red-300"
                      onClick={() => onRemoveFlow(flow.id)}
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-lg px-2.5 py-1 text-[11px] font-medium",
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ModeButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(
        "grid size-7 place-items-center rounded-lg",
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
