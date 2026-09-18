import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const DELETE = withAuth(async (req, { session, params }) => {
  const tx = await db.transaction.findUnique({ where: { id: params!.id } });
  if (!tx) throw new ApiError(404, "المعاملة غير موجودة");

  await db.transaction.delete({ where: { id: tx.id } });
  await logAudit(req, session, "delete", "Transaction", tx.id, `حذف معاملة: ${tx.category}`);
  return ok({ ok: true });
});
