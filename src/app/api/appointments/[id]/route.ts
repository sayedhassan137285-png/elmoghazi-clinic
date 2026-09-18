import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const PUT = withAuth(async (req, { session, params }) => {
  const { done } = await readJson<{ done?: boolean }>(req);
  const ap = await db.appointment.findUnique({ where: { id: params!.id } });
  if (!ap) throw new ApiError(404, "الموعد غير موجود");

  const updated = await db.appointment.update({
    where: { id: ap.id },
    data: { done: typeof done === "boolean" ? done : !ap.done },
    include: { patient: { select: { name: true } } },
  });

  if (done === true) {
    await db.patient.update({
      where: { id: ap.patientId },
      data: { lastVisit: new Date() },
    });
  }

  await logAudit(
    req, session, "update", "Appointment", ap.id,
    `تحديث الموعد: ${updated.patient?.name}`
  );
  return ok(updated);
});

export const DELETE = withAuth(async (req, { session, params }) => {
  const ap = await db.appointment.findUnique({ where: { id: params!.id } });
  if (!ap) throw new ApiError(404, "الموعد غير موجود");

  await db.appointment.delete({ where: { id: ap.id } });
  await logAudit(req, session, "delete", "Appointment", ap.id, `حذف موعد`);
  return ok({ ok: true });
});
