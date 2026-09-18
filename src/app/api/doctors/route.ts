import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const doctors = await db.doctor.findMany({ orderBy: { name: "asc" } });
  return ok({ doctors });
});

const docSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب"),
  specialty: z.string().trim().optional(),
  checkupPercentage: z.coerce.number().min(0).max(100).default(50),
  laserPercentage: z.coerce.number().min(0).max(100).default(50),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = docSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const doctor = await db.doctor.create({ data: parsed.data });
  await logAudit(req, session, "create", "Doctor", doctor.id,
    `إضافة طبيب شريك: ${doctor.name}`);
  return ok({ doctor }, 201);
});
