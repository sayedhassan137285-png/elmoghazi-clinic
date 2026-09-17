import type { NextRequest } from "next/server";

export function clientIp(req: NextRequest | null): string {
  if (!req) return "unknown";
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function userAgent(req: NextRequest | null): string {
  return req?.headers.get("user-agent")?.slice(0, 250) || "unknown";
}
