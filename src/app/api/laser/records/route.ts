import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const records = await db.laserRecord.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patient: { select: { name: true } },
      pkg: { select: { name: true, price: true, sessionsCount: true } },
      sessions: { orderBy: { sessionNumber: "asc" } },
    },
  });
  return ok({ records });
});

const recordSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  area: z.string().trim().min(1, "منطقة الجسم مطلوبة"),
  totalSessions: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
  packageId: z.string().nullish(),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = recordSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const record = await db.laserRecord.create({
    data: {
      patientId: parsed.data.patientId,
      area: parsed.data.area,
      totalSessions: parsed.data.totalSessions,
      packageId: parsed.data.packageId ?? null,
    },
  });

  const pkg = parsed.data.packageId
    ? await db.laserPackage.findUnique({ where: { id: parsed.data.packageId } })
    : null;

  await logAudit(
    req, session, "create", "LaserRecord", record.id,
    `سجل ليزر جديد: ${parsed.data.area}`
  );

  return ok({ record, price: parsed.data.price, pkg: pkg?.name }, 201);
});
