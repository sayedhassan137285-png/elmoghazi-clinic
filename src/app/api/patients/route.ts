import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { fuzzyMatch } from "@/lib/smart-search";

const patientSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جدًا").max(120),
  phone: z.string().trim().regex(/^[0-9+\-\s]{7,20}$/, "رقم الهاتف غير صحيح"),
  age: z.coerce.number().int().min(0).max(130).nullish(),
  address: z.string().trim().max(300).nullish(),
  diagnosis: z.string().trim().max(500).nullish(),
  starred: z.boolean().optional(),
  improved: z.boolean().optional(),
  heart: z.boolean().optional(),
  danger: z.boolean().optional(),
});

// GET /api/patients?q=&page=&limit= — بحث ذكي عربي
export const GET = withAuth(async (req) => {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 20));

  if (q) {
    // البحث الذكي (تطبيع + ضبابي) على أحدث 500 مريض
    const candidates = await db.patient.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const filtered = candidates.filter(
      (p) =>
        fuzzyMatch(q, p.name) || fuzzyMatch(q, p.phone) || fuzzyMatch(q, p.diagnosis)
    );
    const total = filtered.length;
    return ok({
      patients: filtered.slice((page - 1) * limit, page * limit),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.patient.count(),
  ]);
  return ok({ patients, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

// POST /api/patients — إنشاء مريض (مع تحذير تكرار الهاتف بدل الرفض)
export const POST = withAuth(async (req, { session }) => {
  const parsed = patientSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const dup = await db.patient.findFirst({
    where: { phone: parsed.data.phone },
    select: { name: true },
  });

  const patient = await db.patient.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      age: parsed.data.age ?? null,
      address: parsed.data.address ?? null,
      diagnosis: parsed.data.diagnosis ?? null,
      starred: parsed.data.starred ?? false,
      improved: parsed.data.improved ?? false,
      heart: parsed.data.heart ?? false,
      danger: parsed.data.danger ?? false,
    },
  });
  await logAudit(
    req,
    session,
    "create",
    "Patient",
    patient.id,
    `إضافة مريض جديد: ${patient.name}`
  );

  return ok({
    patient,
    warning: dup
      ? `تنبيه: يوجد مريض آخر بنفس رقم الهاتف (${dup.name})`
      : undefined,
  }, 201);
});
