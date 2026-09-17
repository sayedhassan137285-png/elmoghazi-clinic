import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { permsForUser } from "@/lib/auth";

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
