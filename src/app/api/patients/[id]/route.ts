import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

// GET /api/patients/[id] — الملف الكامل
export const GET = withAuth(async (_req, { params }) => {
  const patient = await db.patient.findUnique({
    where: { id: params!.id },
    include: {
      visits: { orderBy: { date: "desc" }, take: 50 },
      sessions: { orderBy: { date: "desc" }, take: 50 },
      laserRecords: {
        orderBy: { createdAt: "desc" },
        include: { sessions: { orderBy: { sessionNumber: "asc" } }, pkg: true },
      },
      notes: { orderBy: { createdAt: "desc" } },
      prescriptions: { orderBy: { date: "desc" }, take: 20, include: { items: true } },
      appointments: { orderBy: { date: "desc" }, take: 20 },
      beforeAfter: { orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { date: "desc" }, take: 50 },
    },
  });
  if (!patient) throw new ApiError(404, "المريض غير موجود");
  return ok({ patient });
});

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,20}$/).optional(),
  age: z.coerce.number().int().min(0).max(130).nullish(),
  address: z.string().trim().max(300).nullish(),
  diagnosis: z.string().trim().max(500).nullish(),
  starred: z.boolean().optional(),
  improved: z.boolean().optional(),
  heart: z.boolean().optional(),
  danger: z.boolean().optional(),
});

export const PUT = withAuth(async (req, { session, params }) => {
  const existing = await db.patient.findUnique({ where: { id: params!.id } });
  if (!existing) throw new ApiError(404, "المريض غير موجود");

  const parsed = updateSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);
  const data = parsed.data;

  if (data.phone && data.phone !== existing.phone) {
    const dup = await db.patient.findFirst({
      where: { phone: data.phone, NOT: { id: existing.id } },
    });
    if (dup) throw new ApiError(409, "يوجد مريض آخر بنفس رقم الهاتف");
  }

  const patient = await db.patient.update({ where: { id: existing.id }, data });
  await logAudit(
    req,
    session,
    "update",
    "Patient",
    patient.id,
    `تعديل بيانات المريض: ${patient.name}`
  );
  return ok(patient);
});

export const DELETE = withAuth(async (req, { session, params }) => {
  const existing = await db.patient.findUnique({ where: { id: params!.id } });
  if (!existing) throw new ApiError(404, "المريض غير موجود");

  await db.patient.delete({ where: { id: existing.id } }); // Cascade يمسح كل بياناته
  await logAudit(
    req,
    session,
    "delete",
    "Patient",
    existing.id,
    `حذف المريض: ${existing.name} ومع كل بياناته`
  );
  return ok({ ok: true });
});
