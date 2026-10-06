import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const forwarded = ["authorization", "content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"];
const returned = ["content-type", "mcp-session-id", "cache-control"];

function upstreamUrl() {
  const configured = process.env.MCP_UPSTREAM_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `http://127.0.0.1:${process.env.MCP_PORT ?? "1235"}/mcp`;
}

async function proxy(request: Request) {
  const headers = new Headers();
  for (const name of forwarded) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const response = await fetch(upstreamUrl(), {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
    const out = new Headers();
    for (const name of returned) {
      const value = response.headers.get(name);
      if (value) out.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: out });
  } catch {
    return NextResponse.json({ error: "mcp unavailable" }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
