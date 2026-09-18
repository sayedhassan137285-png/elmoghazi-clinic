"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Doctor = { id: string; name: string; specialty: string; checkupPercentage: number; laserPercentage: number };

export default function DoctorsPage() {
  const [items, setItems] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/doctors", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).doctors || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/doctors", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"), specialty: f.get("specialty") || "",
        checkupPercentage: Number(f.get("checkupPercentage")),
        laserPercentage: Number(f.get("laserPercentage")),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">الأطباء الشركاء</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ طبيب شريك</button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا أطباء" subtitle="أضف أول طبيب شريك" icon="doctor" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((d) => (
            <div key={d.id} className="card p-5">
              <b className="text-base">{d.name}</b>
              <div className="mt-1 text-sm text-muted">{d.specialty || "—"}</div>
              <div className="mt-4 flex gap-2">
                <div className="flex-1 rounded-xl bg-primary-soft p-3 text-center">
                  <b className="block text-xl text-primary">{d.checkupPercentage}%</b>
                  <span className="text-[11px] font-bold text-muted">نسبة الكشف</span>
                </div>
                <div className="flex-1 rounded-xl bg-primary-soft p-3 text-center">
                  <b className="block text-xl text-primary">{d.laserPercentage}%</b>
                  <span className="text-[11px] font-bold text-muted">نسبة الليزر</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="طبيب شريك جديد">
        <form onSubmit={save} className="space-y-4">
          <Field label="الاسم *"><input name="name" required className="input" /></Field>
          <Field label="التخصص"><input name="specialty" className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نسبة الكشف %"><input name="checkupPercentage" type="number" min="0" max="100" defaultValue="50" className="input" /></Field>
            <Field label="نسبة الليزر %"><input name="laserPercentage" type="number" min="0" max="100" defaultValue="50" className="input" /></Field>
          </div>
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
