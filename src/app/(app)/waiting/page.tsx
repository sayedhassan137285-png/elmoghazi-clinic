"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";

type WaitingEntry = {
  id: string; patientName: string; phone?: string | null;
  priority: number; status: string; createdAt: string;
};

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v || 0);

export default function WaitingPage() {
  const [items, setItems] = useState<WaitingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState(2);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/waiting", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).entries || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/waiting", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName: name, phone: phone || null, priority }),
    });
    setName(""); setPhone(""); setPriority(2);
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/waiting/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const P: Record<number, string> = { 1: "عالي", 2: "عادي", 3: "منخفض" };
  const order: Record<string, number> = { WAITING: 0, SERVED: 1, CANCELLED: 2 };
  const sorted = [...items].sort(
    (a, b) => order[a.status] - order[b.status] || a.priority - b.priority
  );

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="label">اسم المريض</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="w-40">
            <label className="label">الهاتف (اختياري)</label>
            <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="w-36">
            <label className="label">الأولوية</label>
            <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={1}>عالية</option><option value={2}>عادية</option><option value={3}>منخفضة</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">+ إضافة للانتظار</button>
        </form>
      </div>

      {loading ? <Spinner /> : sorted.length === 0 ? (
        <EmptyState title="القائمة فارغة" subtitle="أضف أول مريض للانتظار" icon="clock" />
      ) : (
        <div className="card divide-y divide-line">
          {sorted.map((w) => (
            <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <b>{w.patientName}</b>
                <span className="badge bg-surface-2 text-muted">{P[w.priority]}</span>
                {w.phone && <small dir="ltr" className="text-muted">{w.phone}</small>}
                {w.status !== "WAITING" && (
                  <span className={`badge ${w.status === "SERVED" ? "bg-primary-soft text-primary" : "bg-red-100 text-danger"}`}>
                    {w.status === "SERVED" ? "تم الكشف" : "ملغي"}
                  </span>
                )}
              </div>
              {w.status === "WAITING" && (
                <div className="flex gap-2">
                  <button className="btn-primary btn-sm" onClick={() => setStatus(w.id, "SERVED")}>✅ بدء الكشف</button>
                  <button className="btn-ghost btn-sm" onClick={() => setStatus(w.id, "CANCELLED")}>إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
