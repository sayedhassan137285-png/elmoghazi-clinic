import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const rows = await db.setting.findMany();
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  return ok({ settings });
});

/** PUT { "clinicName": "...", ... } — الطبيب فقط */
export const PUT = withAuth(async (req, { session }) => {
  const body = await readJson<Record<string, string>>(req);
  const entries = Object.entries(body ?? {});
  if (!entries.length) throw new ApiError(400, "لا توجد إعدادات للتحديث");

  for (const [key, value] of entries) {
    await db.setting.upsert({
      where: { key },
      update: { value: String(value ?? "") },
      create: { key, value: String(value ?? "") },
    });
  }
  await logAudit(req, session, "update", "Setting", null, `تحديث ${entries.length} إعداد`);
  return ok({ ok: true });
}, { perm: "settings" });
