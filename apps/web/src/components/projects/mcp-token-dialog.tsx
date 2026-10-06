"use client";

import { useEffect, useState } from "react";
import {
  generateMcpToken,
  listMcpDiagramAccess,
  mcpTokenStatus,
  revokeMcpToken,
  setDiagramMcpEnabled,
  type McpDiagramAccess,
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
  const [diagrams, setDiagrams] = useState<McpDiagramAccess[]>([]);
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
    void listMcpDiagramAccess()
      .then(setDiagrams)
      .catch(() => setError("Could not load diagrams."));
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

  async function toggle(diagramId: string, enabled: boolean) {
    const previous = diagrams;
    setDiagrams((current) => current.map((item) => (item.id === diagramId ? { ...item, mcpEnabled: enabled } : item)));
    setBusyId(diagramId);
    setError(null);
    try {
      await setDiagramMcpEnabled(diagramId, enabled);
    } catch {
      setDiagrams(previous);
      setError("Could not update diagram access.");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(value: string, kind: "token" | "endpoint") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
  }

  const groups = new Map<string, { projectId: string; projectName: string; items: McpDiagramAccess[] }>();
  for (const item of diagrams) {
    const group = groups.get(item.projectId) ?? { projectId: item.projectId, projectName: item.projectName, items: [] };
    group.items.push(item);
    groups.set(item.projectId, group);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="MCP token"
        description="A personal token for an agent. It can open only the diagrams you turn on below."
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
            <div className="text-xs text-zinc-500">Diagram access</div>
            <p className="text-xs text-zinc-600">Off until you enable a diagram.</p>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-[#2a2a2e] px-2 py-2">
              {groups.size === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-zinc-600">No diagrams you can edit.</p>
              ) : (
                Array.from(groups.values()).map((group) => (
                  <div key={group.projectId} className="space-y-1">
                    <div className="px-1 text-[11px] tracking-wide text-zinc-500 uppercase">{group.projectName}</div>
                    {group.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-1 py-1">
                        <span className="min-w-0 truncate text-sm text-zinc-200">{item.label}</span>
                        <Switch
                          checked={item.mcpEnabled}
                          disabled={busyId === item.id}
                          onCheckedChange={(value) => void toggle(item.id, value)}
                        />
                      </div>
                    ))}
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
