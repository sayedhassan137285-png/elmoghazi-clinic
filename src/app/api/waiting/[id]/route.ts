import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const PUT = withAuth(async (req, { session, params }) => {
  const { status } = await readJson<{ status?: string }>(req);
  const valid = ["WAITING", "SERVED", "CANCELLED"];
  if (!status || !valid.includes(status))
    throw new ApiError(400, "حالة غير صحيحة");

  const entry = await db.waitingListEntry.findUnique({ where: { id: params!.id } });
  if (!entry) throw new ApiError(404, "غير موجود");

  const updated = await db.waitingListEntry.update({
    where: { id: entry.id },
    data: { status: status as "WAITING" | "SERVED" | "CANCELLED" },
  });

  await logAudit(
    req, session, "update", "WaitingListEntry", entry.id,
    `تحديث حالة الانتظار: ${entry.patientName} → ${status}`
  );
  return ok(updated);
});
