import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipToLong(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
}

function ipv4Blocked(ip: string) {
  const value = ipToLong(ip);
  if (value === null) return true;
  const ranges: Array<[number, number]> = [
    [ipToLong("0.0.0.0")!, ipToLong("0.255.255.255")!],
    [ipToLong("10.0.0.0")!, ipToLong("10.255.255.255")!],
    [ipToLong("127.0.0.0")!, ipToLong("127.255.255.255")!],
    [ipToLong("169.254.0.0")!, ipToLong("169.254.255.255")!],
    [ipToLong("172.16.0.0")!, ipToLong("172.31.255.255")!],
    [ipToLong("192.168.0.0")!, ipToLong("192.168.255.255")!],
    [ipToLong("224.0.0.0")!, ipToLong("255.255.255.255")!],
  ];
  return ranges.some(([start, end]) => value >= start && value <= end);
}

function ipv6Blocked(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized === "::"
  );
}

export function isBlockedIp(ip: string) {
  const version = isIP(ip);
  if (version === 4) return ipv4Blocked(ip);
  if (version === 6) return ipv6Blocked(ip);
  return true;
}

const allowPrivate = (process.env.HEALTH_RUNNER_ALLOW_PRIVATE ?? "").toLowerCase() === "true";

export async function assertSafeHostname(hostname: string) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) throw new Error("empty host");
  if (!allowPrivate) {
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
      throw new Error("blocked host");
    }
    if (host === "metadata.google.internal") {
      throw new Error("blocked host");
    }
  }

  const literalVersion = isIP(host);
  if (literalVersion) {
    if (!allowPrivate && isBlockedIp(host)) throw new Error("blocked ip");
    return;
  }

  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error("host not found");
  if (allowPrivate) return;
  for (const record of records) {
    if (isBlockedIp(record.address)) throw new Error("blocked resolved ip");
  }
}
