import { z } from "zod";
import { db } from "@/lib/db";
import { ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const packages = await db.laserPackage.findMany({
    orderBy: { name: "asc" },
  });
  return ok({ packages });
});

const pkgSchema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  bodyArea: z.string().trim().min(1, "المنطقة مطلوبة"),
  sessionsCount: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = pkgSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const pkg = await db.laserPackage.create({ data: parsed.data });
  await logAudit(req, session, "create", "LaserPackage", pkg.id, `باقة: ${pkg.name}`);
  return ok({ package: pkg }, 201);
});
