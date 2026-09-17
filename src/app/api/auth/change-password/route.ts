import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { checkPasswordStrength } from "@/lib/password-policy";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(async (req, { session }) => {
  const { currentPassword, newPassword } = await readJson<{
    currentPassword?: string;
    newPassword?: string;
  }>(req);
  if (!currentPassword || !newPassword)
    throw new ApiError(400, "كل الحقول مطلوبة");

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(currentPassword, user.password)))
    throw new ApiError(401, "كلمة المرور الحالية غير صحيحة");

  const check = checkPasswordStrength(newPassword);
  if (!check.ok) throw new ApiError(400, check.errors.join(" — "));

  if (await bcrypt.compare(newPassword, user.password))
    throw new ApiError(400, "لا يمكن استخدام نفس كلمة المرور الحالية");

  await db.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });
  await logAudit(req, session, "password_change", "User", user.id);
  return ok({ ok: true, message: "تم تغيير كلمة المرور بنجاح" });
});
