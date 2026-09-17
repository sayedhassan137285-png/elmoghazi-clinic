"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Icon } from "./icons";

export type MeUser = {
  id: string; email: string; name: string;
  role: "DOCTOR" | "SECRETARY";
  perms: string[]; twoFactorEnabled: boolean;
};

const UserContext = createContext<{ user: MeUser | null; refresh: () => Promise<void> }>(
  { user: null, refresh: async () => {} }
);
export const useUser = () => useContext(UserContext);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      setUser(r.ok ? (await r.json()).user : null);
    } catch { setUser(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <UserContext.Provider value={{ user, refresh }}>{children}</UserContext.Provider>;
}

const canSee = (u: MeUser | null, perm: string) =>
  !!u && (u.role === "DOCTOR" || u.perms.includes(perm));

function applyTheme(theme: string, dark: boolean) {
  const el = document.documentElement;
  el.dataset.theme = theme;
  if (dark) el.dataset.mode = "dark"; else delete el.dataset.mode;
  localStorage.setItem("mc-theme", theme);
  localStorage.setItem("mc-dark", dark ? "1" : "0");
}

const MAIN_NAV = [
  { id: "dashboard", label: "لوحة التحكم", icon: "home", perm: "dashboard" },
  { id: "patients", label: "المرضى", icon: "patients", perm: "patients" },
  { id: "finance", label: "المالية", icon: "wallet", perm: "finance" },
];

const MORE_NAV = [
  { id: "waiting", label: "قائمة الانتظار", icon: "clock", perm: "waiting" },
  { id: "appointments", label: "المواعيد", icon: "calendar", perm: "appointments" },
  { id: "laser", label: "الليزر والباقات", icon: "zap", perm: "laser" },
  { id: "visits", label: "الزيارات", icon: "calendar", perm: "visits" },
  { id: "sessions", label: "الجلسات", icon: "repeat", perm: "sessions" },
  { id: "services", label: "الخدمات والأسعار", icon: "briefcase", perm: "services" },
  { id: "prescriptions", label: "الروشتات", icon: "file", perm: "prescriptions" },
  { id: "reports", label: "التقارير", icon: "chart", perm: "reports" },
  { id: "inventory", label: "المخزون", icon: "box", perm: "inventory" },
  { id: "doctors", label: "الأطباء الشركاء", icon: "doctor", perm: "doctors" },
  { id: "messages", label: "الرسائل", icon: "message", perm: "messages" },
  { id: "personal", label: "مساحتي الشخصية", icon: "user", perm: "personal" },
  { id: "backup", label: "النسخ الاحتياطي", icon: "database", perm: "backup" },
  { id: "audit", label: "سجل النشاط", icon: "shield", perm: "audit" },
  { id: "settings", label: "الإعدادات", icon: "settings", perm: "settings" },
];

const THEMES = [
  { id: "emerald", label: "زمردي", c: "#146c43" },
  { id: "royal", label: "ملكي", c: "#1e3a8a" },
  { id: "ocean", label: "محيطي", c: "#0e7490" },
  { id: "rose", label: "وردي", c: "#be185d" },
  { id: "sunset", label: "غروب", c: "#c2410c" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [themeMenu, setThemeMenu] = useState(false);
  const [theme, setTheme] = useState("emerald");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setTheme(localStorage.getItem("mc-theme") || "emerald");
    setDark(localStorage.getItem("mc-dark") === "1");
  }, []);

  const mainItems = MAIN_NAV.filter((s) => canSee(user, s.perm));
  const moreItems = MORE_NAV.filter((s) => canSee(user, s.perm));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e8c766] text-sm font-black text-[#0d3b2e]">SM</div>
        <div className="min-w-0">
          <div className="truncate font-latin text-sm font-extrabold tracking-wider text-accent">EL MOGHAZI CLINIC</div>
          <div className="truncate text-xs text-muted">عيادة المغازي للجلدية والتجميل</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainItems.map((s) => {
          const isActive = pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`);
          return (
            <Link key={s.id} href={`/${s.id}`} onClick={() => setDrawer(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition
                ${isActive ? "text-white shadow" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
              style={isActive ? { background: "var(--primary)" } : undefined}>
              <Icon name={s.icon} className="h-5 w-5 shrink-0" />
              {s.label}
            </Link>
          );
        })}
        {moreItems.length > 0 && (
          <div className="pt-4">
            <div className="px-3 pb-2 text-[11px] font-black text-muted">المزيد</div>
            {moreItems.map((s) => {
              const isActive = pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`);
              return (
                <Link key={s.id} href={`/${s.id}`} onClick={() => setDrawer(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition
                    ${isActive ? "text-white shadow" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
                  style={isActive ? { background: "var(--primary)" } : undefined}>
                  <Icon name={s.icon} className="h-5 w-5 shrink-0" />
                  {s.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
            {(user?.name || "؟").trim().charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{user?.name || "..."}</div>
            <div className="text-xs text-muted">{user?.role === "DOCTOR" ? "طبيب" : "سكرتيرة"}</div>
          </div>
          <button onClick={logout} title="تسجيل الخروج"
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger">
            <Icon name="logout" className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 start-0 w-72 bg-surface shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur">
          <button className="rounded-lg p-2 hover:bg-surface-2 lg:hidden"
            onClick={() => setDrawer(true)} aria-label="القائمة">
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-lg font-black">
            {mainItems.find((s) => pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`))?.label
              ?? moreItems.find((s) => pathname === `/${s.id}` || pathname.startsWith(`/${s.id}/`))?.label
              ?? "عيادة المغازي"}
          </h1>

          <div className="relative">
            <button className="rounded-lg p-2 hover:bg-surface-2" title="الثيمات"
              onClick={() => setThemeMenu(!themeMenu)}>
              <Icon name="palette" className="h-5 w-5" />
            </button>
            {themeMenu && (
              <div className="card absolute end-0 mt-2 w-44 p-2 shadow-xl">
                {THEMES.map((t) => (
                  <button key={t.id}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
                    onClick={() => { setTheme(t.id); applyTheme(t.id, dark); setThemeMenu(false); }}>
                    <span className="h-4 w-4 rounded-full" style={{ background: t.c }} />
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="rounded-lg p-2 hover:bg-surface-2" title="الوضع الليلي"
            onClick={() => { const d = !dark; setDark(d); applyTheme(theme, d); }}>
            <Icon name={dark ? "sun" : "moon"} className="h-5 w-5" />
          </button>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
