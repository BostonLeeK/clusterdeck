import { eq, lt } from "drizzle-orm";
import { db, verificationTokens } from "@dataflow/db";

function tokenValue() {
  return crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
}

export async function createAuthToken(identifier: string, ttlMs: number) {
  const token = tokenValue();
  const expires = new Date(Date.now() + ttlMs);
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, identifier));
  await db.insert(verificationTokens).values({ identifier, token, expires });
  return { token, expires };
}

export async function consumeAuthTokenByValue(token: string) {
  await db.delete(verificationTokens).where(lt(verificationTokens.expires, new Date()));
  const [row] = await db.select().from(verificationTokens).where(eq(verificationTokens.token, token)).limit(1);
  if (!row) return null;
  if (row.expires.getTime() < Date.now()) {
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
    return null;
  }
  await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
  return row;
}

export async function peekAuthTokenByValue(token: string) {
  const [row] = await db.select().from(verificationTokens).where(eq(verificationTokens.token, token)).limit(1);
  if (!row || row.expires.getTime() < Date.now()) return null;
  return row;
}

export function verifyIdentifier(email: string) {
  return `verify:${email}`;
}

export function resetIdentifier(email: string) {
  return `reset:${email}`;
}

export const VERIFY_TTL_MS = 1000 * 60 * 60 * 24;
export const RESET_TTL_MS = 1000 * 60 * 60;
