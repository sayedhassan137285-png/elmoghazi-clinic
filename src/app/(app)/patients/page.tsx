"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";

type Patient = {
  id: string; name: string; phone: string; age: number | null;
  address?: string | null; diagnosis?: string | null;
  starred: boolean; improved: boolean; heart: boolean; danger: boolean;
  createdAt: string;
};

const emptyForm = { name: "", phone: "", age: "", address: "", diagnosis: "" };

export default function PatientsPage() {
  const [items, setItems] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; patient: Patient } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "12" });
    if (query) params.set("q", query);
    const r = await fetch(`/api/patients?${params}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setItems(d.patients); setPages(d.pages); setTotal(d.total); setPage(d.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(q, 1), q ? 300 : 0);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, load]);

  const openAdd = () => { setForm(emptyForm); setFormError(""); setModal({ mode: "add" }); };
  const openEdit = (p: Patient) => {
    setForm({
      name: p.name, phone: p.phone,
      age: p.age?.toString() ?? "",
      address: p.address ?? "", diagnosis: p.diagnosis ?? "",
    });
    setFormError(""); setModal({ mode: "edit", patient: p });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true); setFormError("");
    const payload = {
      name: form.name, phone: form.phone,
      age: form.age ? Number(form.age) : null,
      address: form.address || null, diagnosis: form.diagnosis || null,
    };
    const url = modal.mode === "add" ? "/api/patients" : `/api/patients/${modal.patient.id}`;
    const r = await fetch(url, {
      method: modal.mode === "add" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setFormError(d.error || "تعذر الحفظ"); return; }
    setWarning(d.warning || "");
    if (d.warning) setTimeout(() => setWarning(""), 5000);
    setModal(null);
    load(q, page);
  };

  const remove = async (p: Patient) => {
    if (!confirm(`حذف المريض «${p.name}» ومعه كل زياراته وجلساته؟ لا يمكن التراجع.`)) return;
    const r = await fetch(`/api/patients/${p.id}`, { method: "DELETE" });
    if (r.ok) load(q, page);
  };

  const toggleStar = async (p: Patient) => {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, starred: !x.starred } : x)));
    const r = await fetch(`/api/patients/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !p.starred }),
    });
    if (!r.ok) load(q, page);
  };

  return (
    <div className="space-y-4">
      {warning && (
        <div className="rounded-xl border border-[#e8c766] bg-[#fdf6e3] px-4 py-3 text-sm font-bold text-[#8a6d1a]">
          {warning}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon name="search" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input ps-10" placeholder="بحث بالاسم أو الهاتف أو التشخيص..."
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Icon name="plus" className="h-4 w-4" /> مريض جديد
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? (
          <EmptyState title={q ? "لا نتائج مطابقة للبحث" : "لا يوجد مرضى بعد"}
            subtitle={q ? "جرّب كتابة الاسم بشكل مختلف" : "ابدأ بإضافة أول مريض"} icon="patients" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-2">
                <tr>
                  <th className="table-th">المريض</th>
                  <th className="table-th">الهاتف</th>
                  <th className="table-th">العمر</th>
                  <th className="table-th">التشخيص</th>
                  <th className="table-th">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-surface-2/50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStar(p)} title="تمييز"
                          className={p.starred ? "text-[#c9a227]" : "text-line hover:text-[#c9a227]"}>
                          <Icon name="star" className="h-4 w-4" />
                        </button>
                        <span className="font-bold">{p.name}</span>
                        {p.improved && <span className="badge bg-primary-soft text-primary">تحسّن</span>}
                        {p.heart && <span className="badge bg-[#fce7f1] text-[#be185d]">❤️</span>}
                        {p.danger && <span className="badge bg-red-100 text-danger">🚨</span>}
                      </div>
                    </td>
                    <td className="table-td" dir="ltr">{p.phone}</td>
                    <td className="table-td">{p.age ?? "—"}</td>
                    <td className="table-td max-w-[200px] truncate text-muted">{p.diagnosis || "—"}</td>
                    <td className="table-td">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p)} title="تعديل"
                          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-primary">
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(p)} title="حذف"
                          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger">
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => load(q, page - 1)}>السابق</button>
          <span className="text-sm font-bold text-muted">صفحة {page} من {pages} ({total} مريض)</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => load(q, page + 1)}>التالي</button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? `تعديل: ${modal.patient.name}` : "إضافة مريض جديد"}>
        <form onSubmit={save} className="space-y-4">
          <Field label="الاسم *">
            <input className="input" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الهاتف *">
              <input className="input" dir="ltr" required value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="العمر">
              <input className="input" type="number" min={0} max={130} value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </Field>
          </div>
          <Field label="العنوان">
            <input className="input" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="التشخيص المبدئي">
            <textarea className="input min-h-[80px]" value={form.diagnosis}
              onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
          </Field>

          {formError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-danger">{formError}</div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
