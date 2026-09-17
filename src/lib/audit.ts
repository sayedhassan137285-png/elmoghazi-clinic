import "server-only";
import type { NextRequest } from "next/server";
import { db } from "./db";
import { clientIp, userAgent } from "./http";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "login_failed"
  | "logout"
  | "block"
  | "unblock"
  | "2fa_enable"
  | "2fa_disable"
  | "2fa_verify"
  | "2fa_verify_failed"
  | "password_change"
  | "permissions_change"
  | "data_wipe"
  | "user_create"
  | "user_delete";

/**
 * تسجيل حدث في سجل النشاط — آمن للاستدعاء من أي مسار (لا يرمي أخطاء أبدًا
 * حتى لا يُعطّل الطلب الأصلي)، مع IP + User Agent لكل عملية.
 */
export async function logAudit(
  req: NextRequest | null,
  session: { userId: string; role: string } | null,
  action: AuditAction,
  entity?: string | null,
  entityId?: string | null,
  description?: string
): Promise<void> {
  try {
    let userName: string | null = null;
    if (session) {
      const u = await db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      });
      userName = u?.name || u?.email || null;
    }
    await db.auditLog.create({
      data: {
        userId: session?.userId ?? null,
        userName,
        userRole: session?.role ?? null,
        action,
        entity: entity ?? null,
        entityId: entityId ?? null,
        description: description ?? null,
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
      },
    });
  } catch (err) {
    console.error("[audit] فشل تسجيل الحدث:", err);
  }
}
