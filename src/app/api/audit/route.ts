import { db } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";

export const GET = withAuth(async (req) => {
  const sp = req.nextUrl.searchParams;
  const take = Math.min(200, Math.max(1, Number(sp.get("take")) || 100));

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return ok({ logs });
});
