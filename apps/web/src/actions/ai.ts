"use server";

import { eq } from "drizzle-orm";
import { db, users } from "@dataflow/db";
import { requireUser } from "@/lib/queries";
import { encryptSecret } from "@/lib/secrets";

export async function getAiKeyStatus() {
  const user = await requireUser();
  const [row] = await db
    .select({ cipher: users.openaiApiKeyCipher, updatedAt: users.openaiApiKeyUpdatedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  return {
    configured: Boolean(row?.cipher),
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveOpenAiApiKey(key: string) {
  const user = await requireUser();
  const trimmed = key.trim();
  if (!trimmed.startsWith("sk-") || trimmed.length < 20) {
    return { error: "Enter a valid OpenAI API key (starts with sk-)." };
  }
  try {
    await db
      .update(users)
      .set({
        openaiApiKeyCipher: encryptSecret(trimmed),
        openaiApiKeyUpdatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    return { ok: true };
  } catch {
    return { error: "Could not save the API key." };
  }
}

export async function clearOpenAiApiKey() {
  const user = await requireUser();
  await db
    .update(users)
    .set({ openaiApiKeyCipher: null, openaiApiKeyUpdatedAt: null })
    .where(eq(users.id, user.id));
  return { ok: true };
}
