"use client";

import { useCallback, useEffect, useState } from "react";
import { Field, Spinner } from "@/components/ui";
import { useUser } from "@/components/app-shell";

type Settings = Record<string, string>;

const FIELDS: { key: string; label: string; type?: "text" | "textarea" | "number" }[] = [
  { key: "clinicName", label: "اسم العيادة (عربي)" },
  { key: "clinicNameEn", label: "اسم العيادة (إنجليزي)" },
  { key: "clinicPhone", label: "هاتف العيادة" },
  { key: "clinicAddress", label: "العنوان", type: "textarea" },
  { key: "workingHours", label: "مواعيد العمل" },
  { key: "receiptFooter", label: "تذييل الإيصال", type: "textarea" },
  { key: "whatsappTemplateAppointment", label: "قالب تذكير الموعد (واتساب)", type: "textarea" },
  { key: "whatsappTemplateRecall", label: "قالب تذكير الغائبين (واتساب)", type: "textarea" },
  { key: "recallDaysThreshold", label: "عدد أيام الغياب قبل التذكير", type: "number" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/settings", { cache: "no-store" });
      if (r.ok) setSettings((await r.json()).settings || {});
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "تعذر الحفظ");
      setMsg({ type: "ok", text: "تم حفظ الإعدادات بنجاح" });
    } catch (err: unknown) {
      const e = err as Error;
      setMsg({ type: "err", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  const canEdit = user?.role === "DOCTOR";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black">الإعدادات</h1>
      </div>

      {!canEdit && (
        <div className="card border-yellow-200 bg-yellow-50 p-4 text-sm font-bold text-yellow-800">
          عرض فقط — تعديل الإعدادات متاح للطبيب فقط.
        </div>
      )}

      {msg && (
        <div className={`card p-3 text-sm font-bold ${msg.type === "ok" ? "bg-primary-soft text-primary" : "bg-red-50 text-danger"}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={save} className="space-y-4">
        <div className="card space-y-4 p-5">
          <h2 className="text-sm font-black text-muted">بيانات العيادة</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <textarea
                    className="input min-h-[80px]"
                    disabled={!canEdit}
                    value={settings[f.key] ?? ""}
                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  />
                ) : (
                  <input
                    className="input"
                    type={f.type === "number" ? "number" : "text"}
                    disabled={!canEdit}
                    value={settings[f.key] ?? ""}
                    onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
