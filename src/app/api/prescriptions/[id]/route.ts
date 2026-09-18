import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async (_req, { params }) => {
  const prescription = await db.prescription.findUnique({
    where: { id: params!.id },
    include: { items: true, patient: true },
  });
  if (!prescription) throw new ApiError(404, "الروشتة غير موجودة");
  return ok({ prescription });
});

export const DELETE = withAuth(async (req, { session, params }) => {
  const rx = await db.prescription.findUnique({ where: { id: params!.id } });
  if (!rx) throw new ApiError(404, "الروشتة غير موجودة");

  await db.prescription.delete({ where: { id: rx.id } });
  await logAudit(req, session, "delete", "Prescription", rx.id, "حذف روشتة");
  return ok({ ok: true });
});
