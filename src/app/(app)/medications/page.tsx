"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Medication = { id: string; name: string; defaultDose: string; defaultInstructions: string };

export default function MedicationsPage() {
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/medications", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).medications || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/medications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"), defaultDose: f.get("defaultDose") || "",
        defaultInstructions: f.get("defaultInstructions") || "",
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">قاعدة الأدوية</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ دواء جديد</button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا أدوية" subtitle="أضف أول دواء للقاعدة" icon="box" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr><th className="table-th">الدواء (EN)</th><th className="table-th">الجرعة</th><th className="table-th">التعليمات (AR)</th></tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-line hover:bg-surface-2/50">
                  <td className="table-td font-bold" dir="ltr">{m.name}</td>
                  <td className="table-td">{m.defaultDose || "—"}</td>
                  <td className="table-td text-muted">{m.defaultInstructions || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="دواء جديد">
        <form onSubmit={save} className="space-y-4">
          <Field label="اسم الدواء (بالإنجليزية) *">
            <input name="name" dir="ltr" required className="input" />
          </Field>
          <Field label="الجرعة الافتراضية">
            <input name="defaultDose" dir="ltr" className="input" />
          </Field>
          <Field label="التعليمات الافتراضية (بالعربية)">
            <textarea name="defaultInstructions" rows={2} className="input" />
          </Field>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">حفظ</button>
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
