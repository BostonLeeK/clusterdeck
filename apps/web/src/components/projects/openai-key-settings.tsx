"use client";

import { useEffect, useState, useTransition } from "react";
import { clearOpenAiApiKey, getAiKeyStatus, saveOpenAiApiKey } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function OpenAiKeySettings({ onChanged }: { onChanged?: () => void }) {
  const [configured, setConfigured] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    void getAiKeyStatus().then((status) => setConfigured(status.configured));
  }, []);

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveOpenAiApiKey(key);
      if (result.error) {
        setError(result.error);
        return;
      }
      setKey("");
      setConfigured(true);
      setMessage("OpenAI key saved.");
      onChanged?.();
    });
  }

  function clear() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      await clearOpenAiApiKey();
      setConfigured(false);
      setMessage("OpenAI key removed.");
      onChanged?.();
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-[#2a2a2e] bg-[#121214] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm text-zinc-200">OpenAI API key</div>
          <div className="text-[11px] text-zinc-500">
            Used only for the in-app AI tab. Stored encrypted.
          </div>
        </div>
        <span className={`text-[11px] ${configured ? "text-emerald-400" : "text-zinc-500"}`}>
          {configured ? "Configured" : "Not set"}
        </span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="openai-api-key">{configured ? "Replace key" : "API key"}</Label>
        <Input
          id="openai-api-key"
          type="password"
          autoComplete="off"
          value={key}
          placeholder="sk-…"
          onChange={(event) => setKey(event.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
      <div className="flex gap-2">
        <Button type="button" className="flex-1" disabled={pending || !key.trim()} onClick={save}>
          {pending ? "Saving…" : "Save key"}
        </Button>
        {configured ? (
          <Button type="button" variant="secondary" disabled={pending} onClick={clear}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
