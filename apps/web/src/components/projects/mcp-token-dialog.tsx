"use client";

import { useEffect, useState } from "react";
import { generateMcpToken, mcpTokenStatus, revokeMcpToken } from "@/actions/mcp";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent } from "@/components/ui/modal";

export function McpTokenDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToken(null);
    setError(null);
    setCopied(false);
    void mcpTokenStatus().then((status) => {
      setCreatedAt(status.createdAt);
      setEndpoint(status.endpoint);
    });
  }, [open]);

  async function generate() {
    setPending(true);
    setError(null);
    setCopied(false);
    try {
      const result = await generateMcpToken();
      setToken(result.token);
      setEndpoint(result.endpoint);
      setCreatedAt(new Date().toISOString());
    } catch {
      setError("Could not create a token.");
    } finally {
      setPending(false);
    }
  }

  async function revoke() {
    setPending(true);
    setError(null);
    try {
      await revokeMcpToken();
      setToken(null);
      setCreatedAt(null);
    } catch {
      setError("Could not revoke the token.");
    } finally {
      setPending(false);
    }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="MCP token"
        description="Create a personal token for an agent. It can read and edit only your diagrams."
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs text-zinc-500">Endpoint</div>
            <code className="block truncate rounded-lg bg-[#121214] px-2 py-1.5 text-xs text-zinc-300">{endpoint || "…"}</code>
          </div>
          {token ? (
            <div className="space-y-2">
              <p className="text-xs text-amber-300">Copy this token now. It will not be shown again.</p>
              <code className="block break-all rounded-lg bg-[#121214] px-2 py-1.5 text-xs text-zinc-200">{token}</code>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void copy(token)}>
                {copied ? "Copied" : "Copy token"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              {createdAt
                ? `A token is active since ${new Date(createdAt).toLocaleString()}. Generating a new one replaces it.`
                : "No token yet. Send it as Authorization: Bearer."}
            </p>
          )}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="button" className="flex-1" disabled={pending} onClick={() => void generate()}>
              {createdAt ? "Regenerate" : "Generate"}
            </Button>
            {createdAt ? (
              <Button type="button" variant="secondary" disabled={pending} onClick={() => void revoke()}>
                Revoke
              </Button>
            ) : null}
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
