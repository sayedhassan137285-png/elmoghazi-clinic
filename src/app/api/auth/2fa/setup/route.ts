import crypto from "crypto";
import { db } from "@/lib/db";
import { ApiError, ok, withAuth } from "@/lib/api";
import { hashSync } from "@/lib/auth";
import { generateSecret, buildOtpAuthUri, toQrDataUrl } from "@/lib/two-factor";

/** POST /api/auth/2fa/setup — سر + QR + 10 أكواد استعادة (تُعرض مرة واحدة) */
export const POST = withAuth(async (_req, { session }) => {
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) throw new ApiError(401, "المستخدم غير موجود");
  if (user.twoFactorEnabled)
    throw new ApiError(400, "المصادقة الثنائية مفعّلة بالفعل — أوقفها أولًا لإعادة الإعداد");

  const secret = generateSecret();
  const uri = buildOtpAuthUri(user.email, secret);
  const qrDataUrl = await toQrDataUrl(uri);

  const plainCodes = Array.from({ length: 10 }, () =>
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
      .replace(/(.{4})(.{4})/, "$1-$2")
  );

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false },
    }),
    db.recoveryCode.deleteMany({ where: { userId: user.id } }),
    db.recoveryCode.createMany({
      data: plainCodes.map((code) => ({ userId: user.id, code: hashSync(code) })),
    }),
  ]);

  return ok({
    secret,
    qrDataUrl,
    recoveryCodes: plainCodes,
    message: "احفظ أكواد الاستعادة الآن — لن تُعرض مرة أخرى",
  });
});
