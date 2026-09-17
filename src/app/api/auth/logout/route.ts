import { ok, withAuth } from "@/lib/api";
import { cookieOpts } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/auth-edge";
import { logAudit } from "@/lib/audit";

export const POST = withAuth(async (req, { session }) => {
  await logAudit(req, session, "logout", "User", session.userId);
  const res = ok({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOpts(0));
  return res;
});
