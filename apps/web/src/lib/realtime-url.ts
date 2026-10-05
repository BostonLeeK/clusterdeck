export function resolveRealtimeUrl() {
  const configured = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();

  if (typeof window === "undefined") {
    return configured || undefined;
  }

  const isLocalHost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const configuredIsLocal = Boolean(configured && /localhost|127\.0\.0\.1/.test(configured));

  if (configured && !(configuredIsLocal && !isLocalHost)) {
    return configured;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/realtime`;
}
