import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";

export const PUT = withAuth(async (req, { params }) => {
  const { paid } = await readJson<{ paid?: boolean }>(req);
  const session = await db.laserSession.findUnique({ where: { id: params!.id } });
  if (!session) throw new ApiError(404, "الجلسة غير موجودة");

  const updated = await db.laserSession.update({
    where: { id: session.id },
    data: { paid: typeof paid === "boolean" ? paid : !session.paid },
  });
  return ok(updated);
});
