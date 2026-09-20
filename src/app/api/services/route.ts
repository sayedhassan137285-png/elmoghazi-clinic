import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const ServiceSchema = z.object({
  name: z.string().min(1, "اسم الخدمة مطلوب").max(120),
  category: z.string().min(1).max(80),
  price: z.number().min(0).default(0),
  duration: z.number().int().min(1).max(600).default(15),
});

/** GET /api/services — قائمة الخدمات */
export const GET = withAuth(async () => {
  const services = await db.service.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return ok({ services });
});

/** POST /api/services — إنشاء خدمة جديدة */
export const POST = withAuth(async (req, { session }) => {
  if (session.role !== "DOCTOR") throw new ApiError(403, "إضافة الخدمات متاحة للطبيب فقط");
  const parsed = ServiceSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "بيانات غير صحيحة");
  const service = await db.service.create({ data: parsed.data });
  await logAudit(req, session, "create", "Service", service.id, `إضافة خدمة: ${service.name}`);
  return ok({ service }, 201);
}, { perm: "services" });
