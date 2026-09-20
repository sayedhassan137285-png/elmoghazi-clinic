import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type TableName =
  | "patient" | "visit" | "transaction" | "appointment"
  | "prescription" | "prescriptionItem" | "medication"
  | "inventoryItem" | "doctor" | "service" | "waitingListEntry"
  | "laserPackage" | "laserRecord" | "laserSession"
  | "note" | "beforeAfter" | "setting" | "user" | "auditLog";

const TABLES: TableName[] = [
  "patient", "visit", "transaction", "appointment",
  "prescription", "prescriptionItem", "medication",
  "inventoryItem", "doctor", "service", "waitingListEntry",
  "laserPackage", "laserRecord", "laserSession",
  "note", "beforeAfter", "setting", "user", "auditLog",
];

/** GET /api/backup?format=json — تصدير قاعدة البيانات كملف JSON */
export const GET = withAuth(async (req, { session }) => {
  if (session.role !== "DOCTOR") throw new ApiError(403, "النسخ الاحتياطي متاح للطبيب فقط");
  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "json";

  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    // Some tables have `createdAt`, others use `date` as their primary timestamp.
    // Use a no-orderBy findMany then sort in JS for portability.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data[t] = await (db as any)[t].findMany();
  }

  // Strip password hashes before export
  if (Array.isArray(data.user)) {
    data.user = (data.user as Array<Record<string, unknown>>).map((u) => {
      const { password, twoFactorSecret, ...safe } = u;
      void password; void twoFactorSecret;
      return safe;
    });
  }

  await logAudit(req, session, "create", "Backup", null, `تصدير نسخة احتياطية (${format})`);

  if (format === "download") {
    const blob = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
    return new Response(blob, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="elmoghazi-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  return ok({ version: 1, exportedAt: new Date().toISOString(), counts: Object.fromEntries(TABLES.map((t) => [t, data[t].length])), data });
}, { perm: "backup" });
