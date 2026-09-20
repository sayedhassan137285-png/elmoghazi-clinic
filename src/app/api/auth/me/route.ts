import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { permsForUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

export const GET = withAuth(async (_req, { session }) => {
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      permissions: true,
      twoFactorEnabled: true,
      blocked: true,
    },
  });
  if (!user || user.blocked) throw new ApiError(401, "الحساب غير متاح");
  return ok({ user: { ...user, perms: permsForUser(user) } });
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2, "الاسم قصير جدًا").max(120).optional(),
});

/** PUT /api/auth/me — تحديث بيانات المستخدم نفسه (الاسم حاليًا) */
export const PUT = withAuth(async (req, { session }) => {
  const parsed = UpdateProfileSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "بيانات غير صحيحة");
  const data: { name?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (!Object.keys(data).length) throw new ApiError(400, "لا توجد بيانات للتحديث");

  const user = await db.user.update({ where: { id: session.userId }, data });
  await logAudit(req, session, "update", "User", user.id, `تحديث البيانات الشخصية: ${user.name}`);
  return ok({ user: { ...user, perms: permsForUser(user) } });
});

