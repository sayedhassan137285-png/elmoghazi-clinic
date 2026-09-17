import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { verifyToken } from "@/lib/two-factor";

/** POST /api/auth/2fa/enable — تفعيل بعد التحقق من الرمز */
export const POST = withAuth(async (req, { session }) => {
  const { token } = await readJson<{ token?: string }>(req);
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user?.twoFactorSecret)
    throw new ApiError(400, "لم يتم إعداد المصادقة الثنائية بعد");
  if (user.twoFactorEnabled) return ok({ ok: true, message: "مفعّلة بالفعل" });
  if (!token || !verifyToken(String(token), user.twoFactorSecret))
    throw new ApiError(400, "الرمز غير صحيح — تأكد من تطبيق المصادقة وحاول مجددًا");

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true },
  });
  await logAudit(req, session, "2fa_enable", "User", user.id, "تفعيل المصادقة الثنائية");
  return ok({ ok: true, message: "تم تفعيل المصادقة الثنائية بنجاح" });
});
