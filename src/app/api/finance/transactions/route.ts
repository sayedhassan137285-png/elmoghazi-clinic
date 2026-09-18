import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const transactions = await db.transaction.findMany({
    orderBy: { date: "desc" },
    take: 200,
    include: { patient: { select: { name: true } } },
  });
  return ok({ transactions });
});

const txSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().trim().min(1, "التصنيف مطلوب"),
  amount: z.coerce.number().min(1, "المبلغ مطلوب"),
  patientId: z.string().nullish(),
  description: z.string().trim().max(300).nullish(),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = txSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const tx = await db.transaction.create({
    data: {
      type: parsed.data.type,
      category: parsed.data.category,
      amount: parsed.data.amount,
      patientId: parsed.data.patientId ?? null,
      description: parsed.data.description ?? null,
    },
    include: { patient: { select: { name: true } } },
  });

  await logAudit(
    req, session, "create", "Transaction", tx.id,
    `${parsed.data.type === "INCOME" ? "إيراد" : "مصروف"}: ${parsed.data.category} — ${parsed.data.amount} ج`
  );
  return ok({ transaction: tx }, 201);
});
