import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError, readJson } from "@/lib/api";
import { verifyPassword, setSessionCookie, setPendingCookie } from "@/lib/auth";
import {
  assertNotRateLimited,
  recordFailedLogin,
  clearFailedLogins,
} from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { verifyToken } from "@/lib/two-factor";

/**
 * POST /api/auth/login
 * تسجيل الدخول: rate limit → تحقق بيانات → 2FA (كود أو كود استعادة)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await readJson<{
      email?: string;
      password?: string;
      twoFactorCode?: string;
      recoveryCode?: string;
    }>(req);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password)
      throw new ApiError(400, "البريد الإلكتروني وكلمة المرور مطلوبان");

    await assertNotRateLimited(email, req);

    const user = await db.user.findUnique({
      where: { email },
      include: { recoveryCodes: true },
    });

    if (!user) {
      await recordFailedLogin(email, req);
      await logAudit(
        req,
        null,
        "login_failed",
        "User",
        null,
        `محاولة دخول ببريد غير موجود: ${email}`
      );
      throw new ApiError(401, "بيانات الدخول غير صحيحة");
    }

    if (user.blocked) {
      await logAudit(req, null, "login_failed", "User", user.id, "محاولة دخول لحساب محجوب");
      throw new ApiError(403, user.blockedReason || "هذا الحساب محجوب. تواصل مع الطبيب المسؤول.");
    }

    if (!(await verifyPassword(password, user.password))) {
      await recordFailedLogin(email, req);
      await logAudit(req, null, "login_failed", "User", user.id, "كلمة مرور خاطئة");
      throw new ApiError(401, "بيانات الدخول غير صحيحة");
    }

    // ─── المرحلة الثانية: المصادقة الثنائية ───
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const code = String(body.twoFactorCode || "").trim();
      const recoveryCode = String(body.recoveryCode || "").trim();

      if (!code && !recoveryCode) {
        const res = NextResponse.json({ requires2FA: true }, { status: 401 });
        await setPendingCookie(res, user.id);
        return res;
      }

      let verified = false;
      if (code) {
        verified = verifyToken(code, user.twoFactorSecret);
      } else if (recoveryCode) {
        const match = user.recoveryCodes.find(
          (rc) => !rc.used && bcrypt.compareSync(recoveryCode, rc.code)
        );
        if (match) {
          await db.recoveryCode.update({ where: { id: match.id }, data: { used: true } });
          verified = true;
        }
      }

      if (!verified) {
        await logAudit(
          req,
          { userId: user.id, role: user.role },
          "2fa_verify_failed",
          "User",
          user.id,
          "رمز تحقق خاطئ"
        );
        throw new ApiError(401, "رمز التحقق غير صحيح");
      }
      await logAudit(req, { userId: user.id, role: user.role }, "2fa_verify", "User", user.id);
    }

    await clearFailedLogins(email, req);
    await logAudit(req, { userId: user.id, role: user.role }, "login", "User", user.id, "تسجيل دخول ناجح");

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
    await setSessionCookie(res, user);
    return res;
  } catch (err) {
    if (err instanceof ApiError)
      return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[login]", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
