"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";
import { useUser } from "@/components/app-shell";
import { Icon } from "@/components/icons";

type Service = {
  id: string; name: string; category: string; price: number; duration: number;
};

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v || 0);

export default function ServicesPage() {
  const { user } = useUser();
  const [items, setItems] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [q, setQ] = useState("");

  const canEdit = user?.role === "DOCTOR";

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/services", { cache: "no-store" });
    if (r.ok) setItems((await r.json()).services || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setEditId(null);
    setFormError("");
    setModal(true);
  };

  const startEdit = (s: Service) => {
    setEditId(s.id);
    setFormError("");
    setModal(true);
    setTimeout(() => {
      const f = document.getElementById("svc-form") as HTMLFormElement | null;
      if (f) {
        (f.elements.namedItem("name") as HTMLInputElement).value = s.name;
        (f.elements.namedItem("category") as HTMLInputElement).value = s.category;
        (f.elements.namedItem("price") as HTMLInputElement).value = String(s.price);
        (f.elements.namedItem("duration") as HTMLInputElement).value = String(s.duration);
      }
    }, 30);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: String(f.get("name") || ""),
      category: String(f.get("category") || ""),
      price: Number(f.get("price") || 0),
      duration: Number(f.get("duration") || 15),
    };
    const r = await fetch(editId ? `/api/services/${editId}` : "/api/services", {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setModal(false);
    load();
  };

  const remove = async (s: Service) => {
    if (!confirm(`حذف الخدمة "${s.name}"؟`)) return;
    await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    load();
  };

  const filtered = items.filter((s) =>
    !q.trim() ||
    s.name.includes(q) ||
    s.category.includes(q)
  );

  const categories = Array.from(new Set(items.map((s) => s.category)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">الخدمات والأسعار</h1>
        {canEdit && <button className="btn-primary" onClick={startCreate}>+ خدمة جديدة</button>}
      </div>

      <div className="card p-3">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input ps-9"
            placeholder="بحث بالاسم أو التصنيف..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="لا خدمات" subtitle="أضف أول خدمة لقائمة الأسعار" icon="briefcase" />
      ) : (
        <div className="space-y-5">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="mb-2 px-1 text-sm font-black text-muted">{cat}</h2>
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-surface-2">
                    <tr>
                      <th className="table-th">الخدمة</th>
                      <th className="table-th">المدة</th>
                      <th className="table-th">السعر</th>
                      {canEdit && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.filter((s) => s.category === cat).map((s) => (
                      <tr key={s.id} className="border-t border-line hover:bg-surface-2/50">
                        <td className="table-td font-bold">{s.name}</td>
                        <td className="table-td text-muted">{s.duration} دقيقة</td>
                        <td className="table-td font-bold text-primary">{money(s.price)}</td>
                        {canEdit && (
                          <td className="table-td">
                            <div className="flex justify-end gap-1">
                              <button className="btn-ghost btn-sm" onClick={() => startEdit(s)} title="تعديل">
                                <Icon name="edit" className="h-4 w-4" />
                              </button>
                              <button className="btn-ghost btn-sm text-danger" onClick={() => remove(s)} title="حذف">
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? "تعديل خدمة" : "إضافة خدمة جديدة"}>
        <form id="svc-form" onSubmit={save} className="space-y-3">
          {formError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-danger">{formError}</div>}
          <Field label="اسم الخدمة">
            <input name="name" required className="input" placeholder="مثال: تنظيف بشرة" />
          </Field>
          <Field label="التصنيف">
            <input name="category" required list="cat-list" className="input" placeholder="مثال: عناية" />
            <datalist id="cat-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر (ج.م)">
              <input name="price" type="number" min={0} step="any" required defaultValue={0} className="input" />
            </Field>
            <Field label="المدة (دقيقة)">
              <input name="duration" type="number" min={1} max={600} required defaultValue={15} className="input" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
            <button type="submit" className="btn-primary">{editId ? "حفظ التعديل" : "إضافة"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
