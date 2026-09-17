import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

/** POST /api/auth/2fa/disable — إيقاف (يتطلب كلمة المرور) */
export const POST = withAuth(async (req, { session }) => {
  const { password } = await readJson<{ password?: string }>(req);
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiError(401, "المستخدم غير موجود");
  if (!password || !(await verifyPassword(password, user.password)))
    throw new ApiError(401, "كلمة المرور غير صحيحة");

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
  await db.recoveryCode.deleteMany({ where: { userId: user.id } });
  await logAudit(req, session, "2fa_disable", "User", user.id, "إيقاف المصادقة الثنائية");
  return ok({ ok: true, message: "تم إيقاف المصادقة الثنائية" });
});
