"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Record<string, string> = { email, password };
      if (step === "2fa") {
        if (useRecovery) payload.recoveryCode = code;
        else payload.twoFactorCode = code;
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 && data.requires2FA) {
        setStep("2fa");
        return;
      }
      if (!res.ok) {
        setError(data.error || "تعذر تسجيل الدخول");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم — تحقق من الاتصال");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-gradient-to-br from-[#0d3b2e] via-[#146c43] to-[#0d3b2e] p-12 text-white lg:flex">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e8c766] text-xl font-black text-[#0d3b2e] shadow-2xl">SM</div>
        <h1 className="mt-6 font-latin text-3xl font-extrabold tracking-wide text-[#e8c766]">EL MOGHAZI CLINIC</h1>
        <p className="mt-2 text-xl font-bold">عيادة المغازي للجلدية والتجميل</p>
        <p className="mt-6 max-w-sm text-center text-sm leading-7 text-white/70">
          نظام إدارة متكامل: المرضى، الزيارات، الجلسات، الليزر، المالية، الروشتات الإلكترونية،
          المخزون، قائمة الانتظار، المواعيد، والنسخ الاحتياطي.
        </p>
        <div className="absolute bottom-8 text-xs text-white/40">حماية بمصادقة ثنائية (2FA) وسجل نشاط كامل</div>
      </div>

      <div className="flex items-center justify-center bg-bg p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#c9a227] to-[#e8c766] font-black text-[#0d3b2e]">SM</div>
            <p className="mt-2 font-latin font-extrabold tracking-wide text-primary">EL MOGHAZI CLINIC</p>
          </div>

          <div className="card p-6 md:p-8">
            <h2 className="text-xl font-black">
              {step === "credentials" ? "تسجيل الدخول" : "رمز التحقق الثنائي"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {step === "credentials"
                ? "أدخل بريدك الإلكتروني وكلمة المرور"
                : "أدخل الكود المكوَّن من 6 أرقام من تطبيق المصادقة"}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {step === "credentials" ? (
                <>
                  <div>
                    <label className="label">البريد الإلكتروني</label>
                    <input
                      dir="ltr" type="email" required autoComplete="email"
                      className="input text-left" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="doctor@elmoghazi.local"
                    />
                  </div>
                  <div>
                    <label className="label">كلمة المرور</label>
                    <input
                      dir="ltr" type="password" required autoComplete="current-password"
                      className="input text-left" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="label">
                      {useRecovery ? "كود الاستعادة" : "رمز التحقق (6 أرقام)"}
                    </label>
                    <input
                      dir="ltr" required autoFocus
                      inputMode={useRecovery ? "text" : "numeric"}
                      maxLength={useRecovery ? 12 : 6}
                      className="input text-center text-2xl font-black tracking-[.5em]"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-sm font-bold text-primary hover:underline"
                    onClick={() => { setUseRecovery(!useRecovery); setCode(""); }}
                  >
                    {useRecovery ? "استخدام رمز من التطبيق بدلًا من ذلك" : "فقدت جهازك؟ استخدم كود استعادة"}
                  </button>
                </>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={busy} className="btn-primary w-full">
                {busy ? "جارٍ التحقق..." : step === "credentials" ? "دخول" : "تحقق ودخول"}
              </button>
              {step === "2fa" && (
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => { setStep("credentials"); setCode(""); setError(""); }}
                >
                  رجوع
                </button>
              )}
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted">© عيادة المغازي — نظام إدارة العيادة</p>
        </div>
      </div>
    </div>
  );
}
