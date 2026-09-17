import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, readJson } from "@/lib/api";
import { readPendingSession, setSessionCookie, cookieOpts } from "@/lib/auth";
import { PENDING_COOKIE } from "@/lib/auth-edge";
import { logAudit } from "@/lib/audit";
import { verifyToken } from "@/lib/two-factor";

/**
 * POST /api/auth/2fa/verify — إتمام الدخول بجلسة مؤقتة (بعد كتابة كلمة المرور)
 */
export async function POST(req: NextRequest) {
  try {
    const pending = await readPendingSession();
    if (!pending) throw new ApiError(401, "انتهت الجلسة المؤقتة — سجّل الدخول من جديد");

    const { code, recoveryCode } = await readJson<{
      code?: string;
      recoveryCode?: string;
    }>(req);
    const user = await db.user.findUnique({
      where: { id: pending.userId },
      include: { recoveryCodes: true },
    });
    if (!user?.twoFactorEnabled || !user.twoFactorSecret)
      throw new ApiError(401, "حالة المصادقة غير صحيحة — سجّل الدخول من جديد");

    let verified = false;
    if (code) {
      verified = verifyToken(code, user.twoFactorSecret);
    } else if (recoveryCode) {
      const match = user.recoveryCodes.find(
        (rc) => !rc.used && bcrypt.compareSync(recoveryCode, rc.code)
      );
      if (match) {
        await db.recoveryCode.update({
          where: { id: match.id },
          data: { used: true },
        });
        verified = true;
      }
    }

    if (!verified) {
      await logAudit(
        req,
        { userId: user.id, role: user.role },
        "2fa_verify_failed",
        "User",
        user.id
      );
      throw new ApiError(401, "رمز التحقق غير صحيح");
    }

    await logAudit(req, { userId: user.id, role: user.role }, "2fa_verify", "User", user.id);
    await logAudit(
      req,
      { userId: user.id, role: user.role },
      "login",
      "User",
      user.id,
      "تسجيل دخول ناجح (عبر 2FA)"
    );

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    res.cookies.set(PENDING_COOKIE, "", cookieOpts(0));
    await setSessionCookie(res, user);
    return res;
  } catch (err) {
    if (err instanceof ApiError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[2fa/verify]", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
