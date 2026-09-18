import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, ok, readJson, withAuth, zodFail } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const GET = withAuth(async () => {
  const appointments = await db.appointment.findMany({
    orderBy: [{ date: "asc" }, { time: "asc" }],
    include: { patient: { select: { name: true } } },
  });
  return ok({ appointments });
});

const apSchema = z.object({
  patientId: z.string().min(1, "المريض مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().min(1, "الساعة مطلوبة"),
  type: z.string().trim().max(200).nullish(),
});

export const POST = withAuth(async (req, { session }) => {
  const parsed = apSchema.safeParse(await readJson(req));
  if (!parsed.success) return zodFail(parsed.error);

  const clash = await db.appointment.findFirst({
    where: {
      date: new Date(parsed.data.date),
      time: parsed.data.time,
      done: false,
    },
  });
  if (clash) throw new ApiError(409, "يوجد موعد آخر في نفس الوقت");

  const appointment = await db.appointment.create({
    data: {
      patientId: parsed.data.patientId,
      date: new Date(parsed.data.date),
      time: parsed.data.time,
      type: parsed.data.type ?? null,
    },
    include: { patient: { select: { name: true } } },
  });

  await logAudit(
    req, session, "create", "Appointment", appointment.id,
    `حجز موعد: ${appointment.patient?.name} — ${parsed.data.date} ${parsed.data.time}`
  );
  return ok({ appointment }, 201);
});
