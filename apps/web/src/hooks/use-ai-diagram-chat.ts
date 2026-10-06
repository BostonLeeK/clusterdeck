"use client";

import { useCallback, useEffect, useState } from "react";
import type { DiagramEdits, DiagramSnapshot } from "@dataflow/shared";
import { getAiKeyStatus } from "@/actions/ai";

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

function storageKey(diagramId: string) {
  return `dataflow:ai:${diagramId}`;
}

function readThread(diagramId: string): AiChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(storageKey(diagramId));
    if (!raw) return [];
    return JSON.parse(raw) as AiChatMessage[];
  } catch {
    return [];
  }
}

function writeThread(diagramId: string, messages: AiChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(diagramId), JSON.stringify(messages.slice(-40)));
  } catch {
    sessionStorage.removeItem(storageKey(diagramId));
  }
}

export function useAiDiagramChat({
  diagramId,
  getSnapshot,
  applyEdits,
  readOnly,
}: {
  diagramId: string;
  getSnapshot: () => DiagramSnapshot;
  applyEdits: (edits: DiagramEdits) => unknown;
  readOnly: boolean;
}) {
  const [messages, setMessages] = useState<AiChatMessage[]>(() => readThread(diagramId));
  const [configured, setConfigured] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDiagramId, setActiveDiagramId] = useState(diagramId);

  if (activeDiagramId !== diagramId) {
    setActiveDiagramId(diagramId);
    setMessages(readThread(diagramId));
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void getAiKeyStatus().then((status) => {
      if (!cancelled) setConfigured(status.configured);
    });
    return () => {
      cancelled = true;
    };
  }, [diagramId]);

  const refreshKeyStatus = useCallback(async () => {
    const status = await getAiKeyStatus();
    setConfigured(status.configured);
    return status.configured;
  }, []);

  const clearThread = useCallback(() => {
    setMessages([]);
    writeThread(diagramId, []);
  }, [diagramId]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending || readOnly) return;
      setError(null);
      setPending(true);
      const userMessage: AiChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      writeThread(diagramId, nextMessages);

      let assistantText = "";
      let applied = 0;
      const assistantId = crypto.randomUUID();

      try {
        const response = await fetch("/api/ai/diagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            diagramId,
            snapshot: getSnapshot(),
            messages: nextMessages
              .filter((item) => item.role === "user" || item.role === "assistant")
              .map((item) => ({ role: item.role, content: item.content })),
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `Request failed (${response.status})`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as {
              type: string;
              text?: string;
              edits?: DiagramEdits;
              error?: string;
              count?: number;
            };
            if (event.type === "text" && event.text) {
              assistantText += event.text;
              setMessages((current) => {
                const without = current.filter((item) => item.id !== assistantId);
                return [
                  ...without,
                  { id: assistantId, role: "assistant", content: assistantText },
                ];
              });
            } else if (event.type === "edits" && event.edits) {
              applyEdits(event.edits);
              applied += 1;
            } else if (event.type === "error") {
              throw new Error(event.error ?? "AI request failed");
            } else if (event.type === "applied" && event.count) {
              applied = Math.max(applied, event.count);
            }
          }
        }

        const note =
          applied > 0
            ? `${assistantText ? `${assistantText}\n\n` : ""}Applied ${applied} diagram update${applied === 1 ? "" : "s"}.`
            : assistantText || "Done.";
        const finalMessages: AiChatMessage[] = [
          ...nextMessages,
          { id: assistantId, role: "assistant", content: note },
        ];
        setMessages(finalMessages);
        writeThread(diagramId, finalMessages);
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI request failed";
        setError(message);
        if (message.toLowerCase().includes("api key")) setConfigured(false);
      } finally {
        setPending(false);
      }
    },
    [applyEdits, diagramId, getSnapshot, messages, pending, readOnly],
  );

  return {
    messages,
    configured,
    pending,
    error,
    send,
    clearThread,
    refreshKeyStatus,
  };
}
