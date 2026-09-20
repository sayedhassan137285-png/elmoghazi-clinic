import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const ServiceSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  price: z.number().min(0).default(0),
  duration: z.number().int().min(1).max(600).default(15),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (r, ctx) => {
    if (ctx.session.role !== "DOCTOR") throw new ApiError(403, "تعديل الخدمات متاح للطبيب فقط");
    const id = ctx.params?.id;
    if (!id) throw new ApiError(400, "معرّف الخدمة مفقود");
    const parsed = ServiceSchema.safeParse(await readJson(r));
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "بيانات غير صحيحة");
    const service = await db.service.update({ where: { id }, data: parsed.data });
    await logAudit(r, ctx.session, "update", "Service", service.id, `تعديل خدمة: ${service.name}`);
    return ok({ service });
  })(req as never, { params });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (r, ctx) => {
    if (ctx.session.role !== "DOCTOR") throw new ApiError(403, "حذف الخدمات متاح للطبيب فقط");
    const id = ctx.params?.id;
    if (!id) throw new ApiError(400, "معرّف الخدمة مفقود");
    const existing = await db.service.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "الخدمة غير موجودة");
    await db.service.delete({ where: { id } });
    await logAudit(r, ctx.session, "delete", "Service", id, `حذف خدمة: ${existing.name}`);
    return ok({ ok: true });
  })(req as never, { params });
}
