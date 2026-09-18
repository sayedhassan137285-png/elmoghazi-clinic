"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Tx = {
  id: string; type: string; category: string; amount: number;
  patientId?: string | null; description?: string | null; date: string;
  patient?: { name: string } | null;
};

type Patient = { id: string; name: string };

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v || 0);

export default function FinancePage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/finance/transactions", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).transactions || []);
    const r2 = await fetch("/api/patients?limit=100", { cache: "no-store" });
    if (r2.ok) setPatients((await r2.json()).patients || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const inc = items.filter((x) => x.type === "INCOME").reduce((a, b) => a + b.amount, 0);
  const exp = items.filter((x) => x.type === "EXPENSE").reduce((a, b) => a + b.amount, 0);

  const remove = async (id: string) => {
    if (!confirm("حذف المعاملة؟")) return;
    await fetch(`/api/finance/transactions/${id}`, { method: "DELETE" });
    load();
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/finance/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: f.get("type"), category: f.get("category"),
        amount: Number(f.get("amount")), patientId: f.get("patientId") || null,
        description: f.get("description") || null,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">الإدارة المالية</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ معاملة جديدة</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5"><span className="text-xs font-bold text-muted">الإيرادات</span>
          <b className="mt-2 block text-2xl text-primary">{money(inc)}</b></div>
        <div className="card p-5"><span className="text-xs font-bold text-muted">المصروفات</span>
          <b className="mt-2 block text-2xl text-danger">{money(exp)}</b></div>
        <div className="card p-5"><span className="text-xs font-bold text-muted">الصافي</span>
          <b className="mt-2 block text-2xl">{money(inc - exp)}</b></div>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا معاملات" subtitle="أضف أول معاملة مالية" icon="wallet" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr>
                <th className="table-th">النوع</th><th className="table-th">التصنيف</th>
                <th className="table-th">المبلغ</th><th className="table-th">المريض</th>
                <th className="table-th">الوصف</th><th className="table-th">التاريخ</th><th></th>
              </tr>
            </thead>
            <tbody>
              {[...items].sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
                <tr key={x.id} className="border-t border-line hover:bg-surface-2/50">
                  <td className="table-td">
                    <span className={`badge ${x.type === "INCOME" ? "bg-primary-soft text-primary" : "bg-red-100 text-danger"}`}>
                      {x.type === "INCOME" ? "إيراد" : "مصروف"}
                    </span>
                  </td>
                  <td
