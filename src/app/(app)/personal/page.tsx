"use client";

import { useCallback, useEffect, useState } from "react";
import { Field, Spinner } from "@/components/ui";
import { useUser } from "@/components/app-shell";
import { Icon } from "@/components/icons";

type My2FAState = {
  twoFactorEnabled: boolean;
  setup?: { secret: string; qrDataUrl: string; recoveryCodes: string[] };
};

export default function PersonalPage() {
  const { user, refresh } = useUser();
  const [tab, setTab] = useState<"profile" | "security" | "activity">("profile");

  // profile state
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // password state
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  // 2FA state
  const [faState, setFaState] = useState<My2FAState>({ twoFactorEnabled: false });
  const [loading2fa, setLoading2fa] = useState(true);
  const [stepVerify, setStepVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [faMsg, setFaMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // activity state
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const load2fa = useCallback(async () => {
    setLoading2fa(true);
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setFaState({ twoFactorEnabled: !!d.user?.twoFactorEnabled });
    }
    setLoading2fa(false);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    const r = await fetch("/api/audit?take=50", { cache: "no-store" });
    if (r.ok) setLogs((await r.json()).logs || []);
    setLoadingLogs(false);
  }, []);

  useEffect(() => { load2fa(); loadLogs(); }, [load2fa, loadLogs]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: String(f.get("name") || "") }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setProfileMsg({ type: "err", text: d.error || "تعذر الحفظ" }); }
    else {
      setProfileMsg({ type: "ok", text: "تم تحديث البيانات" });
      refresh();
    }
    setSavingProfile(false);
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    const f = new FormData(e.target as HTMLFormElement);
    const newPw = String(f.get("newPassword") || "");
    const conf = String(f.get("confirm") || "");
    if (newPw !== conf) { setPwMsg({ type: "err", text: "كلمتا المرور غير متطابقتين" }); setSavingPw(false); return; }
    if (newPw.length < 8) { setPwMsg({ type: "err", text: "كلمة المرور يجب أن تكون 8 أحرف أو أكثر" }); setSavingPw(false); return; }

    const r = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: String(f.get("currentPassword") || ""),
        newPassword: newPw,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setPwMsg({ type: "err", text: d.error || "تعذر التغيير" });
    else {
      setPwMsg({ type: "ok", text: "تم تغيير كلمة المرور" });
      (e.target as HTMLFormElement).reset();
    }
    setSavingPw(false);
  };

  const startEnable2FA = async () => {
    setFaMsg(null);
    const r = await fetch("/api/auth/2fa/setup", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFaMsg({ type: "err", text: d.error || "تعذر تجهيز المصادقة" }); return; }
    setFaState({ twoFactorEnabled: false, setup: d });
    setStepVerify(true);
  };

  const verify2FA = async () => {
    setFaMsg(null);
    if (!verifyCode || verifyCode.length !== 6) {
      setFaMsg({ type: "err", text: "أدخل كود 6 أرقام" });
      return;
    }
    const r = await fetch("/api/auth/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verifyCode }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFaMsg({ type: "err", text: d.error || "كود غير صحيح" }); return; }
    setFaMsg({ type: "ok", text: "تم تفعيل المصادقة الثنائية" });
    setStepVerify(false);
    setVerifyCode("");
    setFaState({ twoFactorEnabled: true });
    refresh();
  };

  const disable2FA = async () => {
    const pw = prompt("أدخل كلمة المرور لتعطيل 2FA:");
    if (!pw) return;
    setFaMsg(null);
    const r = await fetch("/api/auth/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFaMsg({ type: "err", text: d.error || "تعذر التعطيل" }); return; }
    setFaMsg({ type: "ok", text: "تم تعطيل 2FA" });
    setFaState({ twoFactorEnabled: false });
    refresh();
  };

  if (!user) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-2xl font-black text-primary">
          {user.name.trim().charAt(0)}
        </div>
        <div>
          <h1 className="text-xl font-black">{user.name}</h1>
          <p className="text-sm text-muted">{user.email} — {user.role === "DOCTOR" ? "طبيب" : "سكرتيرة"}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {[
          { id: "profile", label: "بياناتي" },
          { id: "security", label: "الأمان وكلمة المرور" },
          { id: "activity", label: "آخر نشاطي" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              tab === t.id ? "bg-surface text-primary shadow" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <form onSubmit={saveProfile} className="card space-y-4 p-5">
          <h2 className="text-sm font-black text-muted">بيانات الحساب</h2>
          {profileMsg && (
            <div className={`rounded-lg p-3 text-sm font-bold ${profileMsg.type === "ok" ? "bg-primary-soft text-primary" : "bg-red-50 text-danger"}`}>
              {profileMsg.text}
            </div>
          )}
          <Field label="الاسم الكامل">
            <input name="name" defaultValue={user.name} className="input" />
          </Field>
          <Field label="البريد الإلكتروني">
            <input value={user.email} disabled className="input opacity-70" />
          </Field>
          <Field label="الصلاحية">
            <input value={user.role === "DOCTOR" ? "طبيب (كل الصلاحيات)" : "سكرتيرة"} disabled className="input opacity-70" />
          </Field>
          {user.role === "SECRETARY" && (
            <Field label="الأقسام المصرّح بها">
              <div className="flex flex-wrap gap-2">
                {user.perms.map((p) => (
                  <span key={p} className="badge bg-primary-soft text-primary">{p}</span>
                ))}
                {user.perms.length === 0 && <span className="text-sm text-muted">لا صلاحيات إضافية</span>}
              </div>
            </Field>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? "جارٍ الحفظ..." : "حفظ البيانات"}
            </button>
          </div>
        </form>
      )}

      {tab === "security" && (
        <div className="space-y-4">
          <form onSubmit={changePw} className="card space-y-4 p-5">
            <h2 className="text-sm font-black text-muted">تغيير كلمة المرور</h2>
            {pwMsg && (
              <div className={`rounded-lg p-3 text-sm font-bold ${pwMsg.type === "ok" ? "bg-primary-soft text-primary" : "bg-red-50 text-danger"}`}>
                {pwMsg.text}
              </div>
            )}
            <Field label="كلمة المرور الحالية">
              <input name="currentPassword" type="password" className="input" required />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="كلمة المرور الجديدة">
                <input name="newPassword" type="password" className="input" required minLength={8} />
              </Field>
              <Field label="تأكيد كلمة المرور">
                <input name="confirm" type="password" className="input" required />
              </Field>
            </div>
            <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
              <b>سياسة كلمة المرور:</b> 8 أحرف على الأقل، تحتوي على حرف ورقم، وغير شائعة.
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={savingPw}>
                {savingPw ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
              </button>
            </div>
          </form>

          <div className="card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-muted">المصادقة الثنائية (2FA)</h2>
              {faState.twoFactorEnabled ? (
                <span className="badge bg-primary-soft text-primary">مفعّلة</span>
              ) : (
                <span className="badge bg-surface-2 text-muted">غير مفعّلة</span>
              )}
            </div>
            {faMsg && (
              <div className={`rounded-lg p-3 text-sm font-bold ${faMsg.type === "ok" ? "bg-primary-soft text-primary" : "bg-red-50 text-danger"}`}>
                {faMsg.text}
              </div>
            )}
            {loading2fa ? <Spinner /> : faState.twoFactorEnabled ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">حسابك محمي بطبقة أمان إضافية. سيُطلب منك كود OTP عند كل تسجيل دخول.</p>
                <button className="btn-danger" onClick={disable2FA}>تعطيل المصادقة الثنائية</button>
              </div>
            ) : stepVerify && faState.setup ? (
              <div className="space-y-3">
                <p className="text-sm font-bold">امسح الـ QR أدناه بتطبيق Authenticator (Google/Microsoft):</p>
                <div className="rounded-xl bg-white p-4 text-center">
                  <img src={faState.setup.qrDataUrl} alt="QR" className="mx-auto h-48 w-48" />
                  <p className="mt-2 font-mono text-xs text-muted">{faState.setup.secret}</p>
                </div>
                <p className="text-sm font-bold">أكواد الاستعادة (احفظها في مكان آمن):</p>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 font-mono text-xs">
                  {faState.setup.recoveryCodes.map((c, i) => <div key={i}>{c}</div>)}
                </div>
                <Field label="أدخل كود التحقق (6 أرقام)">
                  <input
                    className="input text-center font-mono text-lg"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={() => { setStepVerify(false); setVerifyCode(""); }}>إلغاء</button>
                  <button className="btn-primary" onClick={verify2FA}>تفعيل</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">فعّل المصادقة الثنائية لحماية حسابك بكود يُولّد كل 30 ثانية من تطبيق Authenticator.</p>
                <button className="btn-primary" onClick={startEnable2FA}>تفعيل المصادقة الثنائية</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="card overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="text-sm font-black text-muted">آخر 50 سجل نشاط</h2>
          </div>
          {loadingLogs ? <Spinner /> : logs.length === 0 ? (
            <p className="p-5 text-sm text-muted">لا يوجد نشاط بعد.</p>
          ) : (
            <div className="divide-y divide-line">
              {(logs as Array<{ action: string; description?: string; createdAt: string; ipAddress?: string }>).map((l, i) => (
                <div key={i} className="flex items-start gap-3 p-4 text-sm">
                  <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{l.action}</div>
                    {l.description && <div className="text-muted">{l.description}</div>}
                    <div className="text-xs text-muted">{new Date(l.createdAt).toLocaleString("ar-EG")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
