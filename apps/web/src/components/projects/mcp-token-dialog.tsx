"use client";

import { useEffect, useState } from "react";
import {
  generateMcpToken,
  listMcpProjectAccess,
  mcpTokenStatus,
  revokeMcpToken,
  setProjectMcpEnabled,
  type McpProjectAccess,
} from "@/actions/mcp";
import { Button } from "@/components/ui/button";
import { Modal, ModalContent } from "@/components/ui/modal";
import { Switch } from "@/components/ui/switch";

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
  const [items, setItems] = useState<McpProjectAccess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState<"token" | "endpoint" | null>(null);

  useEffect(() => {
    if (!open) return;
    setToken(null);
    setError(null);
    setCopied(null);
    void mcpTokenStatus().then((status) => {
      setCreatedAt(status.createdAt);
      setEndpoint(status.endpoint);
    });
    void listMcpProjectAccess()
      .then(setItems)
      .catch(() => setError("Could not load projects."));
  }, [open]);

  async function generate() {
    setPending(true);
    setError(null);
    setCopied(null);
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

  async function toggle(projectId: string, enabled: boolean) {
    const previous = items;
    setItems((current) => current.map((item) => (item.id === projectId ? { ...item, mcpEnabled: enabled } : item)));
    setBusyId(projectId);
    setError(null);
    try {
      await setProjectMcpEnabled(projectId, enabled);
    } catch {
      setItems(previous);
      setError("Could not update project access.");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(value: string, kind: "token" | "endpoint") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="MCP token"
        description="A personal token for an agent. It can open only the projects you turn on below."
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs text-zinc-500">Endpoint</div>
            <div className="flex items-center gap-2">
              <code className="block min-w-0 flex-1 truncate rounded-lg bg-[#121214] px-2 py-1.5 text-xs text-zinc-300">
                {endpoint || "…"}
              </code>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                disabled={!endpoint}
                onClick={() => void copy(endpoint, "endpoint")}
              >
                {copied === "endpoint" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          {token ? (
            <div className="space-y-2">
              <p className="text-xs text-amber-300">Copy this token now. It will not be shown again.</p>
              <code className="block break-all rounded-lg bg-[#121214] px-2 py-1.5 text-xs text-zinc-200">{token}</code>
              <Button type="button" variant="secondary" className="w-full" onClick={() => void copy(token, "token")}>
                {copied === "token" ? "Copied" : "Copy token"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              {createdAt
                ? `Token active since ${new Date(createdAt).toLocaleString()}. A new one replaces it. Send it as a Bearer token.`
                : "No token yet."}
            </p>
          )}
          <div className="space-y-1">
            <div className="text-xs text-zinc-500">Project access</div>
            <p className="text-xs text-zinc-600">Off until you enable a project. It covers every inner diagram.</p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[#2a2a2e] px-2 py-2">
              {items.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-zinc-600">No projects you can edit.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-1 py-1">
                    <span className="min-w-0 truncate text-sm text-zinc-200">{item.name}</span>
                    <Switch
                      checked={item.mcpEnabled}
                      disabled={busyId === item.id}
                      onCheckedChange={(value) => void toggle(item.id, value)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
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
