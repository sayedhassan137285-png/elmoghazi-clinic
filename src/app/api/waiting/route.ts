import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const entries = await db.waitingListEntry.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return ok({ entries });
});

const waitingSchema = z.object({
  patientName: z.string().trim().min(2, "الاسم مطلوب"),
  phone: z.string().trim().max(20).nullish(),
  priority: z.coerce.number().int().min(1).max(3).default(2),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = waitingSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  // الربط الذكي: لو الاسم مطابق لمريض موجود
  const match = await db.patient.findFirst({
    where: { name: { contains: parsed.data.patientName } },
    select: { id: true, name: true },
  });

  const entry = await db.waitingListEntry.create({
    data: {
      patientName: parsed.data.patientName,
      phone: parsed.data.phone ?? null,
      priority: parsed.data.priority,
      patientId: match?.id ?? null,
    },
  });

  await logAudit(
    req, session, "create", "WaitingListEntry", entry.id,
    `إضافة للانتظار: ${entry.patientName}${match ? ` (مرتبط: ${match.name})` : ""}`
  );
  return ok({ entry }, 201);
});
