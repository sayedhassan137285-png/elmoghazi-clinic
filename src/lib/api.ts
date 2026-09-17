import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  hasPerm,
  type SessionPayload,
} from "./auth-edge";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type Ctx = {
  session: SessionPayload;
  params: Record<string, string> | undefined;
};

/**
 * يغلّف أي Route Handler: مصادقة + صلاحيات + params + معالجة أخطاء موحّدة.
 * مثال:  export const GET = withAuth(handler, { perm: "patients" });
 */
export function withAuth(
  handler: (req: NextRequest, ctx: Ctx) => Promise<Response> | Response,
  opts?: { perm?: string }
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<Record<string, string>> }
  ) => {
    try {
      const session = await verifySessionToken(
        req.cookies.get(SESSION_COOKIE)?.value
      );
      if (!session || session.typ === "2fa")
        throw new ApiError(401, "غير مصرح — يرجى تسجيل الدخول");
      if (opts?.perm && !hasPerm(session, opts.perm))
        throw new ApiError(403, "ليست لديك صلاحية للوصول إلى هذا القسم");
      const params = routeCtx?.params ? await routeCtx.params : undefined;
      return await handler(req, { session, params });
    } catch (err) {
      if (err instanceof ApiError)
        return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof z.ZodError)
        return NextResponse.json(
          { error: err.errors[0]?.message || "بيانات غير صحيحة" },
          { status: 400 }
        );
      console.error("[API]", err);
      return NextResponse.json(
        { error: "حدث خطأ غير متوقع في الخادم" },
        { status: 500 }
      );
    }
  };
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function readJson<T = Record<string, unknown>>(
  req: NextRequest
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError(400, "صيغة الطلب غير صحيحة");
  }
}

export function zodFail(err: z.ZodError): never {
  throw new ApiError(400, err.errors[0]?.message || "بيانات غير صحيحة");
}
