export function safeCallbackUrl(value: string | null | undefined, fallback = "/projects") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
