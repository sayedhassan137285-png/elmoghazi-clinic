"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Item = { id: string; name: string; quantity: number; minQuantity: number; unitPrice: number };

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v || 0);

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/inventory", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).items || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const r = await fetch("/api/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.get("name"), quantity: Number(f.get("quantity")),
        minQuantity: Number(f.get("minQuantity")), unitPrice: Number(f.get("unitPrice")),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false); load();
  };

  const low = items.filter((i) => i.quantity <= i.minQuantity);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black">المخزون</h1>
        <button className="btn-primary" onClick={() => setModal(true)}>+ صنف جديد</button>
      </div>

      {low.length > 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">
          ⚠️ نواقص: {low.map((i) => i.name).join("، ")}
        </div>
      )}

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا أصناف" subtitle="أضف أول صنف" icon="box" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2">
              <tr><th className="table-th">الصنف</th><th className="table-th">الكمية</th><th className="table-th">الحد الأدنى</th><th className="table-th">سعر الوحدة</th><th className="table-th">الحالة</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-line hover:bg-surface-2/50">
                  <td className="table-td font-bold">{i.name}</td>
                  <td className="table-td">{i.quantity}</td>
                  <td className="table-td">{i.minQuantity}</td>
                  <td className="table-td">{money(i.unitPrice)}</td>
                  <td className="table-td">
                    {i.quantity <= i.minQuantity
                      ? <span className="badge bg-red-100 text-danger">⚠️ نواقص</span>
                      : <span className="badge bg-primary-soft text-primary">متوفر</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="صنف جديد">
        <form onSubmit={save} className="space-y-4">
          <Field label="الاسم *">
            <input name="name" required className="input" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="الكمية"><input name="quantity" type="number" min="0" defaultValue="0" className="input" /></Field>
            <Field label="الحد الأدنى"><input name="minQuantity" type="number" min="0" defaultValue="0" className="input" /></Field>
            <Field label="سعر الوحدة"><input name="unitPrice" type="number" min="0" defaultValue="0" className="input" /></Field>
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
