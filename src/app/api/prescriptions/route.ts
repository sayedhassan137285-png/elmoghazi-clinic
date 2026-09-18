import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const prescriptions = await db.prescription.findMany({
    orderBy: { date: "desc" },
    include: {
      patient: { select: { name: true } },
      items: true,
    },
  });
  return ok({ prescriptions });
});

const rxSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  diagnosis: z.string().trim().max(300).nullish(),
  items: z.array(z.object({
    drug: z.string().trim().min(1),
    dose: z.string().trim().optional(),
    ins: z.string().trim().optional(),
    showInstructions: z.boolean().default(true),
    showDose: z.boolean().default(true),
  })).min(1, "أضف دواء واحدًا على الأقل"),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = rxSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const prescription = await db.prescription.create({
    data: {
      patientId: parsed.data.patientId,
      diagnosis: parsed.data.diagnosis ?? null,
      items: {
        create: parsed.data.items.map((it) => ({
          medicationName: it.drug,
          dose: it.dose ?? "",
          showInstructions: it.showInstructions,
          showDose: it.showDose,
        })),
      },
    },
    include: { items: true, patient: { select: { name: true } } },
  });

  await logAudit(req, session, "create", "Prescription", prescription.id,
    `روشتة جديدة: ${prescription.patient?.name}`);
  return ok({ prescription }, 201);
});
