import { connect } from "node:net";
import type { NodeHealthConfig, NodeStatus } from "@dataflow/shared";
import { assertSafeHostname } from "./ssrf";

export type ProbeResult = {
  status: NodeStatus;
  message: string;
  ok: boolean;
};

function parseTcpTarget(raw: string) {
  const trimmed = raw.trim();
  const withoutProtocol = trimmed.replace(/^tcp:\/\//i, "");
  const [hostPart, portPart] = withoutProtocol.split(":");
  const host = hostPart?.trim();
  const port = Number(portPart);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("tcp target must be host:port");
  }
  return { host, port };
}

async function probeTcp(url: string, timeoutMs: number): Promise<ProbeResult> {
  const { host, port } = parseTcpTarget(url);
  await assertSafeHostname(host);
  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error("tcp timeout"));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return { ok: true, status: "healthy", message: `tcp ${host}:${port} open` };
}

async function probeHttp(url: string, expectStatus: number, timeoutMs: number): Promise<ProbeResult> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("only http/https supported");
  }
  await assertSafeHostname(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": "ClusterDeck-HealthRunner/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      return { ok: false, status: "degraded", message: `redirect ${response.status}` };
    }
    const ok = response.status === expectStatus;
    return {
      ok,
      status: ok ? "healthy" : response.status >= 500 ? "offline" : "degraded",
      message: `HTTP ${response.status}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeHealth(health: NodeHealthConfig, timeoutMs = 10_000): Promise<ProbeResult> {
  if (!health.url?.trim()) {
    return { ok: false, status: "unknown", message: "missing url" };
  }
  if (health.kind === "external") {
    return { ok: false, status: "unknown", message: "external probes are push-only" };
  }
  try {
    if (health.kind === "tcp") return await probeTcp(health.url, timeoutMs);
    return await probeHttp(health.url, health.expectStatus ?? 200, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "probe failed";
    return { ok: false, status: "offline", message };
  }
}
