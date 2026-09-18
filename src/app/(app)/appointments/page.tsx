"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Appointment = {
  id: string; patientId: string; date: string; time: string;
  type?: string | null; done: boolean;
  patient?: { name: string } | null;
};

type Patient = { id: string; name: string };

const AP_HOURS = ["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"];
const AP_DAYS = ["السبت","الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس"];

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/appointments", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).appointments || []);
    const r2 = await fetch("/api/patients?limit=100", { cache: "no-store" });
    if (r2.ok) setPatients((await r2.json()).patients || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/appointments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: f.get("patientId"), date: f.get("date"),
        time: f.get("time"), type: f.get("type") || null,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); load();
  };

  const markDone = async (id: string) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: true }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الموعد؟")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    load();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 1) % 7));
  const days = AP_DAYS.map((lbl, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    return { lbl, iso: d.toISOString().slice(0, 10), isToday: d.toISOString().slice(0, 10) === todayStr };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">المواعيد الأسبوعية</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ حجز موعد</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="card overflow-x-auto p-3">
            {AP_HOURS.map((h) => (
              <div key={h} className="mb-2 flex min-w-[640px] gap-2">
                <div className="flex w-16 flex-shrink-0 items-center text-xs font-extrabold text-muted">{h}</div>
                {days.map((d) => {
                  const ap = items.find((x) => x.date.slice(0, 10) === d.iso && x.time === h);
                  return ap ? (
                    <div key={d.iso} className={`flex-1 rounded-xl border p-1.5 text-center text-[11px] font-bold ${ap.done ? "border-line bg-surface-2 text-muted line-through" : "border-primary bg-primary-soft text-primary"}`}>
                      <span className="block truncate">{ap.patient?.name}</span>
                      {ap.type && <small className="block">{ap.type}</small>}
                    </div>
                  ) : (
                    <div key={d.iso} className="flex-1 rounded-xl border border-dashed border-line p-1.5"></div>
                  );
                })}
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState title="لا مواعيد" subtitle="احجز أول موعد" icon="calendar" />
          ) : (
            <div className="card divide-y divide-line">
              {[...items].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((a) => {
                const dd = new Date(a.date);
                return (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{a.patient?.name || "—"}</b>
                      <span className="badge bg-surface-2 text-muted">
                        {dd.toLocaleDateString("ar-EG", { weekday: "long" })} {a.time}
                      </span>
                      {a.type && <small className="text-muted">{a.type}</small>}
                      {a.done ? <span className="badge bg-primary-soft text-primary">تم</span>
                        : <span className="badge bg-[#fdf3d7] text-[#8a6d1a]">قادم</span>}
                    </div>
                    <div className="flex gap-2">
                      {!a.done && <button className="btn-primary btn-sm" onClick={() => markDone(a.id)}>✅ تم الكشف</button>}
                      <button className="btn-ghost btn-sm" onClick={() => remove(a.id)}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="حجز موعد جديد">
        <form onSubmit={save} className="space-y-4">
          <Field label="المريض *">
            <select name="patientId" required className="input">
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التاريخ *">
              <input name="date" type="date" required defaultValue={todayStr} className="input" />
            </Field>
            <Field label="الساعة *">
              <select name="time" required className="input">
                {AP_HOURS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </Field>
          </div>
          <Field label="الموضوع (اختياري)">
            <input name="type" className="input" placeholder="متابعة / ليزر جلسة 4/8..." />
          </Field>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary flex-1">حجز</button>
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
