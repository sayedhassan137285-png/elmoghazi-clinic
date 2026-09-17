import "server-only";
import type { NextRequest } from "next/server";
import { db } from "./db";
import { clientIp } from "./http";
import { ApiError } from "./api";

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

/**
 * 5 محاولات فاشلة / 15 دقيقة لكل (email + IP)
 */
export async function assertNotRateLimited(email: string, req: NextRequest) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const count = await db.failedLogin.count({
    where: {
      email,
      ipAddress: clientIp(req),
      createdAt: { gte: since },
    },
  });
  if (count >= MAX_ATTEMPTS)
    throw new ApiError(
      429,
      `تم تجاوز الحد المسموح من المحاولات (${MAX_ATTEMPTS}). أعد المحاولة بعد ${WINDOW_MINUTES} دقيقة.`
    );
}

export async function recordFailedLogin(email: string, req: NextRequest) {
  try {
    await db.failedLogin.create({ data: { email, ipAddress: clientIp(req) } });
  } catch {}
}

export async function clearFailedLogins(email: string, req: NextRequest) {
  try {
    await db.failedLogin.deleteMany({
      where: { email, ipAddress: clientIp(req) },
    });
  } catch {}
}
