import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";

/** POST — إضافة جلسة تفصيلية لسجل الليزر */
export const POST = withAuth(async (req, { session, params }) => {
  const record = await db.laserRecord.findUnique({
    where: { id: params!.id },
    include: { sessions: true },
  });
  if (!record) throw new ApiError(404, "السجل غير موجود");
  if (record.sessions.length >= record.totalSessions)
    throw new ApiError(400, "تم إكمال كل الجلسات بالفعل");

  const nextNumber = record.sessions.length + 1;
  const session = await db.laserSession.create({
    data: {
      laserRecordId: record.id,
      sessionNumber: nextNumber,
    },
  });

  if (nextNumber >= record.totalSessions) {
    await db.laserRecord.update({
      where: { id: record.id },
      data: { status: "COMPLETED" },
    });
  }

  await logAudit(
    req, session, "update", "LaserRecord", record.id,
    `تسجيل جلسة ليزر رقم ${nextNumber}`
  );
  return ok({ session }, 201);
});
