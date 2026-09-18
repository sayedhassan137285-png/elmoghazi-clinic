import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const medications = await db.medication.findMany({ orderBy: { name: "asc" } });
  return ok({ medications });
});

const medSchema = z.object({
  name: z.string().trim().min(1, "اسم الدواء مطلوب"),
  defaultDose: z.string().trim().optional(),
  defaultInstructions: z.string().trim().optional(),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = medSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const medication = await db.medication.create({ data: parsed.data });
  await logAudit(req, session, "create", "Medication", medication.id,
    `إضافة دواء: ${medication.name}`);
  return ok({ medication }, 201);
});
