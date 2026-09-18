"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type RxItem = { id: string; medicationName: string; dose: string; showInstructions: boolean; showDose: boolean };
type Prescription = {
  id: string; patientId: string; date: string; diagnosis?: string | null;
  patient?: { name: string } | null; items: RxItem[];
};
type Patient = { id: string; name: string };
type Medication = { id: string; name: string; defaultDose: string; defaultInstructions: string };

export default function PrescriptionsPage() {
  const [items, setItems] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [rows, setRows] = useState([{ drug: "", dose: "", ins: "", showDose: true, showInstructions: true }]);

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2, r3] = await Promise.all([
      fetch("/api/prescriptions", { cache: "no-store" }),
      fetch("/api/patients?limit=100", { cache: "no-store" }),
      fetch("/api/medications", { cache: "no-store" }),
    ]);
    if (r1.ok) setItems((await r1.json()).prescriptions || []);
    if (r2.ok) setPatients((await r2.json()).patients || []);
    if (r3.ok) setMeds((await r3.json()).medications || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addRow = () => setRows([...rows, { drug: "", dose: "", ins: "", showDose: true, showInstructions: true }]);
  const updateRow = (i: number, key: string, val: string | boolean) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/prescriptions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: f.get("patientId"),
        diagnosis: f.get("diagnosis") || null,
        items: rows.filter((x) => x.drug.trim()),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); setRows([{ drug: "", dose: "", ins: "", showDose: true, showInstructions: true }]);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الروشتة؟")) return;
    await fetch(`/api/prescriptions/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">الروشتات</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ روشتة جديدة</button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا روشتات" subtitle="أنشئ أول روشتة" icon="file" />
      ) : (
        <div className="card divide-y divide-line">
          {items.map((rx) => (
            <div key={rx.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b>{rx.patient?.name || "—"}</b>
                <span dir="ltr" className="badge bg-surface-2 text-muted">{rx.diagnosis || "—"}</span>
                <span className="badge bg-primary-soft text-primary">{rx.items.length} دواء</span>
                <small className="text-muted">{new Date(rx.date).toLocaleDateString("ar-EG")}</small>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => remove(rx.id)}>🗑️ حذف</button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="روشتة جديدة" wide>
        <form onSubmit={save} className="space-y-4">
          <Field label="المريض *">
            <select name="patientId" required className="input">
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="التشخيص (بالإنجليزية)">
            <input name="diagnosis" dir="ltr" className="input" placeholder="Acne vulgaris..." />
          </Field>
          <b className="block text-sm">الأدوية *</b>
          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input dir="ltr" list="meds-list" className="input" placeholder="Drug name"
                    value={row.drug} onChange={(e) => updateRow(i, "drug", e.target.value)} />
                  <input dir="ltr" className="input" placeholder="Dose"
                    value={row.dose} onChange={(e) => updateRow(i, "dose", e.target.value)} />
                  <input className="input" placeholder="التعليمات بالعربية"
                    value={row.ins} onChange={(e) => updateRow(i, "ins", e.target.value)} />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs font-bold">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={row.showDose} onChange={(e) => updateRow(i, "showDose", e.target.checked)} /> الجرعة
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={row.showInstructions} onChange={(e) => updateRow(i, "showInstructions", e.target.checked)} /> التعليمات
                  </label>
                  {rows.length > 1 && (
                    <button type="button" className="mr-auto text-danger" onClick={() => setRows(rows.filter((_, idx) => idx !== i))}>✕ حذف</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <datalist id="meds-list">
            {meds.map((m) => <option key={m.id} value={m.name} />)}
          </datalist>
          <button type="button" className="btn-ghost btn-sm" onClick={addRow}>+ إضافة دواء</button>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">حفظ الروشتة</button>
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
