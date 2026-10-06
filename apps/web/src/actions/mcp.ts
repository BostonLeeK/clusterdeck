"use server";

import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, users } from "@dataflow/db";
import { requireUser } from "@/lib/queries";

function mcpEndpoint() {
  const configured = process.env.MCP_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return `http://localhost:${process.env.MCP_PORT ?? "1235"}/mcp`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function mcpTokenStatus() {
  const user = await requireUser();
  const [row] = await db
    .select({ createdAt: users.mcpTokenCreatedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return {
    createdAt: row?.createdAt?.toISOString() ?? null,
    endpoint: mcpEndpoint(),
  };
}

export async function generateMcpToken() {
  const user = await requireUser();
  const token = `cd_${randomBytes(32).toString("base64url")}`;
  await db
    .update(users)
    .set({ mcpTokenHash: hashToken(token), mcpTokenCreatedAt: new Date() })
    .where(eq(users.id, user.id));
  return { token, endpoint: mcpEndpoint() };
}

export async function revokeMcpToken() {
  const user = await requireUser();
  await db
    .update(users)
    .set({ mcpTokenHash: null, mcpTokenCreatedAt: null })
    .where(eq(users.id, user.id));
  return { ok: true as const };
}
