"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type LaserSession = {
  id: string; sessionNumber: number; paid: boolean; date: string;
};

type LaserRecord = {
  id: string; patientId: string; area: string; totalSessions: number;
  status: string; packageId?: string | null; paidAmount?: number | null;
  createdAt: string;
  patient?: { name: string } | null;
  pkg?: { name: string; price: number; count: number } | null;
  sessions: LaserSession[];
};

type Package = {
  id: string; name: string; bodyArea: string; sessionsCount: number; price: number;
};

type Patient = { id: string; name: string };

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v || 0);

export default function LaserPage() {
  const [records, setRecords] = useState<LaserRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"record" | "pkg" | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/laser/records", { cache: "no-store" }),
      fetch("/api/laser/packages", { cache: "no-store" }),
    ]);
    if (r1.ok) setRecords((await r1.json()).records || []);
    if (r2.ok) setPackages((await r2.json()).packages || []);
    const r3 = await fetch("/api/patients?limit=100", { cache: "no-store" });
    if (r3.ok) setPatients((await r3.json()).patients || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openRecord = () => { setFormError(""); setModal("record"); };
  const openPkg = () => { setFormError(""); setModal("pkg"); };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/laser/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: f.get("patientId"), area: f.get("area"),
        totalSessions: Number(f.get("totalSessions")), price: Number(f.get("price")),
        packageId: f.get("packageId") || null,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(null); load();
  };

  const savePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/laser/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"), bodyArea: f.get("bodyArea"),
        sessionsCount: Number(f.get("sessionsCount")), price: Number(f.get("price")),
      }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(null); load();
  };

  const addSession = async (recordId: string) => {
    await fetch(`/api/laser/records/${recordId}/sessions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    load();
  };

  const togglePaid = async (recordId: string, sessionId: string, paid: boolean) => {
    await fetch(`/api/laser/sessions/${sessionId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !paid }),
    });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-xl font-black">الليزر والباقات</h1>
        <button className="btn-ghost" onClick={openPkg}>+ باقة جديدة</button>
        <button className="btn-primary" onClick={openRecord}>+ سجل ليزر</button>
      </div>

      {loading ? <Spinner /> : records.length === 0 ? (
        <EmptyState title="لا توجد سجلات ليزر" subtitle="ابدأ بإضافة أول سجل" icon="zap" />
      ) : (
        records.map((l) => {
          const done = l.sessions.length;
          const st = done >= l.totalSessions;
          const pct = Math.min(100, Math.round((done / Math.max(1, l.totalSessions)) * 100));
          const paidAmt = l.paidAmount ?? l.sessions.filter((s) => s.paid).length * (l.sessions.length ? 0 : 0);
          const perSession = 0;
          const remaining = l.paidAmount != null ? Math.max(0, (l.pkg?.price ?? 0) - l.paidAmount) : null;
          return (
            <div key={l.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{l.patient?.name || "—"}</span>
                  <span className="badge bg-surface-2 text-muted">📍 {l.area}</span>
                  {l.pkg && <span className="badge bg-[#fdf3d7] text-[#8a6d1a]">🎁 {l.pkg.name}</span>}
                  {st ? <span className="badge bg-primary-soft text-primary">مكتمل ✓</span>
                      : <span className="badge bg-[#fdf3d7] text-[#8a6d1a]">نشط — باقي {l.totalSessions - done}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <b className="text-primary">{done} / {l.totalSessions}</b>
                  {!st && (
                    <button className="btn-primary btn-sm" onClick={() => addSession(l.id)}>+ جلسة</button>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="min-w-[90px] flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--primary)" }} />
                  </div>
                </div>
                <b className="text-sm">{pct}%</b>
                {remaining != null && remaining > 0
                  ? <span className="badge bg-red-100 text-danger">💳 متبقي {money(remaining)}</span>
                  : <span className="badge bg-primary-soft text-primary">💰 مسدد</span>}
              </div>
              {done > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {l.sessions.map((s) => (
                    <button key={s.id}
                      onClick={() => togglePaid(l.id, s.id, s.paid)}
                      className={`rounded-xl border p-2 text-center text-[11px] transition hover:opacity-80 ${
                        s.paid ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted"
                      }`}>
                      <b className="block text-sm">جلسة {s.sessionNumber}</b>
                      <small className="block">{new Date(s.date).toLocaleDateString("ar-EG")}</small>
                      <small className="block">{s.paid ? "✓ مدفوع" : "✕ غير مدفوع"}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal open={modal === "record"} onClose={() => setModal(null)} title="سجل ليزر جديد">
        <form onSubmit={saveRecord} className="space-y-4">
          <Field label="المريض *">
            <select name="patientId" required className="input">
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="من باقة؟ (يملأ البيانات تلقائيًا)">
            <select name="packageId" className="input" onChange={(e) => {
              const pk = packages.find((x) => x.id === e.target.value);
              const form = e.target.closest("form")!;
              if (pk) {
                (form.querySelector('[name="area"]') as HTMLInputElement).value = pk.bodyArea;
                (form.querySelector('[name="totalSessions"]') as HTMLInputElement).value = String(pk.sessionsCount);
                (form.querySelector('[name="price"]') as HTMLInputElement).value = String(pk.price);
              }
            }}>
              <option value="">— اختيار حر —</option>
              {packages.map((pk) => <option key={pk.id} value={pk.id}>{pk.name}</option>)}
            </select>
          </Field>
          <Field label="منطقة الجسم *">
            <input name="area" required className="input" placeholder="الوجه، أطراف، فول بودي..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="عدد الجلسات *">
              <input name="totalSessions" type="number" min="1" defaultValue="6" required className="input" />
            </Field>
            <Field label="السعر الكلي (ج)">
              <input name="price" type="number" min="0" defaultValue="2400" className="input" />
            </Field>
          </div>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "..." : "حفظ"}</button>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal open={modal === "pkg"} onClose={() => setModal(null)} title="باقة ليزر جديدة">
        <form onSubmit={savePkg} className="space-y-4">
          <Field label="الاسم *">
            <input name="name" required className="input" placeholder="ليزر شعر — الوجه كامل" />
          </Field>
          <Field label="المنطقة *">
            <input name="bodyArea" required className="input" placeholder="الوجه" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="عدد الجلسات">
              <input name="sessionsCount" type="number" min="1" defaultValue="6" className="input" />
            </Field>
            <Field label="السعر">
              <input name="price" type="number" min="0" defaultValue="2400" className="input" />
            </Field>
          </div>
          {formError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? "..." : "حفظ"}</button>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
