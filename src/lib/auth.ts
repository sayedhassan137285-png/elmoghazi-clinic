import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import {
  SESSION_COOKIE,
  PENDING_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./auth-edge";

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}
export function hashSync(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

/** صلاحيات السكرتيرة من DB — الطبيب يملك "*"(الكل) */
export function permsForUser(user: Pick<User, "role" | "permissions">): string[] {
  if (user.role === "DOCTOR") return ["*"];
  return Array.isArray(user.permissions) ? (user.permissions as string[]) : [];
}

export function cookieOpts(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function setSessionCookie(
  res: NextResponse,
  user: Pick<User, "id" | "role" | "permissions">
) {
  const token = await createSessionToken({
    userId: user.id,
    role: user.role,
    perms: permsForUser(user),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
    typ: "session",
  });
  res.cookies.set(SESSION_COOKIE, token, cookieOpts());
}

/** جلسة مؤقتة 5 دقائق لحين إدخال كود الـ 2FA */
export async function setPendingCookie(res: NextResponse, userId: string) {
  const token = await createSessionToken({
    userId,
    role: "PENDING",
    perms: [],
    exp: Date.now() + 5 * 60 * 1000,
    typ: "2fa",
  });
  res.cookies.set(PENDING_COOKIE, token, cookieOpts(300));
}

export async function readPendingSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const payload = await verifySessionToken(jar.get(PENDING_COOKIE)?.value);
  return payload && payload.typ === "2fa" ? payload : null;
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const payload = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  return payload && payload.typ !== "2fa" ? payload : null;
}
