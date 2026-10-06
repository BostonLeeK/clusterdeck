import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "v1:";

function keyMaterial() {
  const secret = process.env.CREDENTIALS_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is required to store credentials");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptSecret(payload: string) {
  if (!payload.startsWith(PREFIX)) throw new Error("Unsupported secret encoding");
  const raw = Buffer.from(payload.slice(PREFIX.length), "base64url");
  if (raw.length < 28) throw new Error("Invalid secret payload");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
