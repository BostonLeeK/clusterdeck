import { eq } from "drizzle-orm";
import { db, users } from "@dataflow/db";
import { decryptSecret } from "@/lib/secrets";

export async function loadUserOpenAiApiKey(userId: string) {
  const [row] = await db
    .select({ cipher: users.openaiApiKeyCipher })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.cipher) return null;
  try {
    return decryptSecret(row.cipher);
  } catch {
    return null;
  }
}
