import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken, hasPerm } from "@/lib/auth-edge";

const PUBLIC_PATHS = ["/", "/login"];

// مسار القسم ← مفتاح الصلاحية
const SECTION_PERMS: Record<string, string> = {
  "/dashboard": "dashboard",
  "/patients": "patients",
  "/laser": "laser",
  "/finance": "finance",
  "/waiting": "waiting",
  "/appointments": "appointments",
  "/visits": "visits",
  "/sessions": "sessions",
  "/services": "services",
  "/prescriptions": "prescriptions",
  "/medications": "prescriptions",
  "/rxdesign": "prescriptions",
  "/reports": "reports",
  "/inventory": "inventory",
  "/recall": "reports",
  "/settlements": "reports",
  "/doctors": "doctors",
  "/messages": "messages",
  "/personal": "personal",
  "/backup": "backup",
  "/audit": "audit",
  "/settings": "settings",
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    if (pathname === "/login") {
      const s = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
      if (s && s.typ !== "2fa")
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/favicon")
  )
    return NextResponse.next();

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session || session.typ === "2fa") {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session.role === "DOCTOR") return NextResponse.next();

  // السكرتيرة: فحص صلاحية القسم
  const section = Object.keys(SECTION_PERMS).find(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (section) {
    const perm = SECTION_PERMS[section];
    if (!hasPerm(session, perm))
      return NextResponse.redirect(new URL("/dashboard?denied=1", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
