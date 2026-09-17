/**
 * جلسات موقّعة HMAC-SHA256 — متوافقة مع Edge Runtime
 * (بدون bcrypt وبدون node:crypto)
 */

export const SESSION_COOKIE = "elmoghazi_session";
export const PENDING_COOKIE = "elmoghazi_2fa";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 يوم

export type SessionPayload = {
  userId: string;
  role: string;
  perms: string[];
  exp: number; // بالميلي ثانية
  typ?: "session" | "2fa";
};

function getSecret(): string {
  return process.env.AUTH_SECRET || "";
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(JSON.stringify(payload));
  return `${body}.${await hmac(body)}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!timingSafeEqual(sig, await hmac(body))) return null;
  try {
    const payload = JSON.parse(fromBase64Url(body)) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hasPerm(session: SessionPayload, perm: string): boolean {
  if (session.role === "DOCTOR") return true;
  return session.perms?.includes(perm) ?? false;
}
