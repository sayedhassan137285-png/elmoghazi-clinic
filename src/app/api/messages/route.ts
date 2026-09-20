import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const TEMPLATE_TYPES = {
  APPOINTMENT_REMINDER: {
    label: "تذكير موعد",
    body: (vars: Record<string, string>) =>
      `مرحبًا ${vars.patientName}،\nنذكّركم بموعدكم في عيادة المغازي يوم ${vars.date} الساعة ${vars.time}.\nنتمنى لكم يومًا سعيدًا.`,
  },
  RECALL: {
    label: "تذكير غائب",
    body: (vars: Record<string, string>) =>
      `مرحبًا ${vars.patientName}،\nلم نركم منذ فترة في عيادة المغازي.\nيُرجى الحجز لمتابعة حالتكم: ${vars.phone ?? ""}`,
  },
  FOLLOWUP: {
    label: "متابعة حالة",
    body: (vars: Record<string, string>) =>
      `مرحبًا ${vars.patientName}،\nنتمنى أن تكونوا بخير بعد الزيارة.\nهل لديكم أي استفسار؟ ${vars.phone ?? ""}`,
  },
  PACKAGE_REMINDER: {
    label: "تذكير جلسة باقة",
    body: (vars: Record<string, string>) =>
      `مرحبًا ${vars.patientName}،\nباقتك (الجلسة ${vars.sessionNumber} من ${vars.totalSessions}) مستحقة.\nيرجى الحجز.`,
  },
  BIRTHDAY: {
    label: "تهنئة ميلاد",
    body: (vars: Record<string, string>) =>
      `كل سنة وانت طيب ${vars.patientName}! 🎂\nنتمنى لك عامًا سعيدًا مليئًا بالصحة.`,
  },
} as const;

type TemplateKey = keyof typeof TEMPLATE_TYPES;

const SendSchema = z.object({
  patientId: z.string().optional(),
  phone: z.string().min(7, "رقم الهاتف مطلوب").max(20),
  template: z.string().min(1),
  vars: z.record(z.string()).optional().default({}),
});

/** GET /api/messages — سجل الرسائل + القوالب */
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const take = Math.min(parseInt(url.searchParams.get("take") || "100", 10) || 100, 200);
  const [logs, patientsCount] = await Promise.all([
    db.messageLog.findMany({ orderBy: { createdAt: "desc" }, take }),
    db.patient.count(),
  ]);
  return ok({
    logs,
    templates: Object.entries(TEMPLATE_TYPES).map(([k, v]) => ({ id: k, label: v.label })),
    patientsCount,
  });
});

/** POST /api/messages — إرسال رسالة (محاكاة — تسجيل فقط) */
export const POST = withAuth(async (req, { session }) => {
  const parsed = SendSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0]?.message || "بيانات غير صحيحة");
  const { phone, template, vars, patientId } = parsed.data;

  const tpl = TEMPLATE_TYPES[template as TemplateKey];
  if (!tpl) throw new ApiError(400, "قالب غير معروف");

  const body = tpl.body(vars || {});
  const log = await db.messageLog.create({
    data: {
      phone,
      template,
      body,
      status: "SENT",
      sentAt: new Date(),
      patientId: patientId ?? null,
    },
  });
  await logAudit(req, session, "create", "MessageLog", log.id, `إرسال رسالة (${tpl.label}) إلى ${phone}`);

  // In production: integrate with WhatsApp Business API here.
  // Currently simulating successful send.

  return ok({ log, simulated: true }, 201);
});
