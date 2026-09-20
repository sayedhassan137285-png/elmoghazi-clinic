"use client";

import { useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";
import { useUser } from "@/components/app-shell";
import { Icon } from "@/components/icons";

type Counts = Record<string, number>;

export default function BackupPage() {
  const { user } = useUser();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const canBackup = user?.role === "DOCTOR";

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/backup", { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          setCounts(d.counts);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const download = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/backup?format=download");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "تعذر التصدير");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elmoghazi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ type: "ok", text: "تم تصدير النسخة الاحتياطية بنجاح" });
    } catch (err: unknown) {
      const e = err as Error;
      setMsg({ type: "err", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!canBackup) {
    return (
      <EmptyState
        title="غير مصرّح"
        subtitle="النسخ الاحتياطي متاح للطبيب فقط."
        icon="shield"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black">النسخ الاحتياطي</h1>
        <button className="btn-primary" onClick={download} disabled={busy}>
          {busy ? "جارٍ التصدير..." : "تصدير نسخة احتياطية"}
        </button>
      </div>

      {msg && (
        <div className={`card p-3 text-sm font-bold ${msg.type === "ok" ? "bg-primary-soft text-primary" : "bg-red-50 text-danger"}`}>
          {msg.text}
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-black text-muted">حالة قاعدة البيانات</h2>
        {loading ? <Spinner /> : !counts ? (
          <p className="text-sm text-muted">تعذّر تحميل الإحصاءات.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(counts).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                <span className="text-sm font-bold">{table}</span>
                <span className="text-lg font-black text-primary">{count as number}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-black text-muted">معلومات النسخ الاحتياطي</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <Icon name="box" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>التصدير بصيغة JSON يتضمّن كل الجداول (المرضى، الزيارات، المعاملات، المواعيد، الروشتات، المخزون، الأطباء، الخدمات، قوائم الليزر والانتظار، الإعدادات، والسجلات).</span>
          </li>
          <li className="flex items-start gap-2">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>تُستبعد كلمات المرور وأسرار 2FA من النسخة الاحتياطية لأمان الحسابات.</span>
          </li>
          <li className="flex items-start gap-2">
            <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>يُنصح بإجراء نسخة احتياطية أسبوعيًا على الأقل، وقبل أي تحديث جوهري.</span>
          </li>
          <li className="flex items-start gap-2">
            <Icon name="database" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>الإجراء يُسجَّل في سجل النشاط لأغراض المراجعة.</span>
          </li>
        </ul>
      </div>

      <div className="card border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm font-bold text-yellow-900">
          ⚠️ هذه نسخة احتياطية يدوية فقط. للنسخ التلقائي المجدول، اربط قاعدة البيانات بخدمة تخزين سحابي (مثل Supabase Storage أو AWS S3).
        </p>
      </div>
    </div>
  );
}
