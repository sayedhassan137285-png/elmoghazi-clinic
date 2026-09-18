import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const visits = await db.visit.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { patient: { select: { name: true } } },
  });
  return ok({ visits });
});

const visitSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  type: z.enum(["CHECKUP", "FOLLOWUP"]),
  price: z.coerce.number().min(0),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = visitSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const visit = await db.visit.create({
    data: {
      patientId: parsed.data.patientId,
      type: parsed.data.type,
      price: parsed.data.price,
    },
    include: { patient: { select: { name: true } } },
  });

  // تسجيل المعاملة المالية تلقائيًا
  await db.transaction.create({
    data: {
      type: "INCOME",
      category: parsed.data.type === "CHECKUP" ? "كشف" : "إعادة",
      amount: parsed.data.price,
      patientId: parsed.data.patientId,
      description: "دفعة زيارة",
    },
  });

  await db.patient.update({
    where: { id: parsed.data.patientId },
    data: { lastVisit: new Date() },
  });

  await logAudit(req, session, "create", "Visit", visit.id,
    `زيارة جديدة: ${visit.patient?.name}`);
  return ok({ visit }, 201);
});
