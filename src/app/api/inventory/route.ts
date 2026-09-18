import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const items = await db.inventoryItem.findMany({ orderBy: { name: "asc" } });
  return ok({ items });
});

const invSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب"),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = invSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const item = await db.inventoryItem.create({ data: parsed.data });
  await logAudit(req, session, "create", "InventoryItem", item.id,
    `إضافة صنف: ${item.name}`);
  return ok({ item }, 201);
});
