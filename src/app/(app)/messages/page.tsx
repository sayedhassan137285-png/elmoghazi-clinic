"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, Field, Spinner, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icons";

type Template = { id: string; label: string };
type Log = {
  id: string; phone: string; template: string; body: string;
  status: "PENDING" | "SENT" | "FAILED"; sentAt: string | null; createdAt: string;
  patientId?: string | null;
};
type Patient = { id: string; name: string; phone: string; lastVisit?: string | null };

export default function MessagesPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [formError, setFormError] = useState("");
  const [filter, setFilter] = useState<"all" | "recall" | "appointments">("all");
  const [preview, setPreview] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch("/api/messages", { cache: "no-store" }),
      fetch("/api/patients?limit=200", { cache: "no-store" }),
    ]);
    if (r1.ok) {
      const d = await r1.json();
      setLogs(d.logs || []);
      setTemplates(d.templates || []);
    }
    if (r2.ok) {
      const d = await r2.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const recallThreshold = 60; // days
  const recallPatients = patients.filter((p) => {
    if (!p.lastVisit) return false;
    const diff = (now.getTime() - new Date(p.lastVisit).getTime()) / (1000 * 60 * 60 * 24);
    return diff >= recallThreshold;
  });

  const displayedLogs =
    filter === "recall"
      ? logs.filter((l) => l.template === "RECALL")
      : filter === "appointments"
      ? logs.filter((l) => l.template === "APPOINTMENT_REMINDER")
      : logs;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const f = new FormData(e.target as HTMLFormElement);
    const patientId = String(f.get("patientId") || "");
    const template = String(f.get("template") || "");
    const p = patients.find((x) => x.id === patientId);
    const phone = String(f.get("phone") || p?.phone || "");
    if (!phone) { setFormError("رقم الهاتف مطلوب"); return; }
    if (!template) { setFormError("اختر القالب"); return; }

    const vars: Record<string, string> = {
      patientName: p?.name ?? "",
      phone: "01000000000",
      date: new Date().toLocaleDateString("ar-EG"),
      time: "10:00",
      sessionNumber: "1",
      totalSessions: "8",
    };

    const r = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patientId || undefined, phone, template, vars }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setFormError(d.error || "تعذر الإرسال"); return; }
    setModal(false);
    setPreview("");
    load();
  };

  const previewBody = (template: string, patientId: string) => {
    const p = patients.find((x) => x.id === patientId);
    const name = p?.name ?? "المريض";
    if (template === "APPOINTMENT_REMINDER")
      return `مرحبًا ${name}،\nنذكّركم بموعدكم في عيادة المغازي يوم ${new Date().toLocaleDateString("ar-EG")} الساعة 10:00.\nنتمنى لكم يومًا سعيدًا.`;
    if (template === "RECALL")
      return `مرحبًا ${name}،\nلم نركم منذ فترة في عيادة المغازي.\nيُرجى الحجز لمتابعة حالتكم: 01000000000`;
    if (template === "FOLLOWUP")
      return `مرحبًا ${name}،\nنتمنى أن تكونوا بخير بعد الزيارة.\nهل لديكم أي استفسار؟ 01000000000`;
    if (template === "PACKAGE_REMINDER")
      return `مرحبًا ${name}،\nباقتك (الجلسة 1 من 8) مستحقة.\nيرجى الحجز.`;
    if (template === "BIRTHDAY")
      return `كل سنة وانت طيب ${name}! 🎂\nنتمنى لك عامًا سعيدًا مليئًا بالصحة.`;
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">الرسائل والتذكيرات</h1>
        <button className="btn-primary" onClick={() => { setModal(true); setFormError(""); setPreview(""); }}>
          + رسالة جديدة
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <span className="text-xs font-bold text-muted">إجمالي الرسائل</span>
          <b className="mt-1 block text-2xl">{logs.length}</b>
        </div>
        <div className="card p-4">
          <span className="text-xs font-bold text-muted">تم إرسالها</span>
          <b className="mt-1 block text-2xl text-primary">{logs.filter((l) => l.status === "SENT").length}</b>
        </div>
        <div className="card p-4">
          <span className="text-xs font-bold text-muted">مرضى غائبون (60+ يوم)</span>
          <b className="mt-1 block text-2xl text-danger">{recallPatients.length}</b>
        </div>
      </div>

      {recallPatients.length > 0 && (
        <div className="card border-yellow-200 bg-yellow-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Icon name="bell" className="h-5 w-5 text-yellow-700" />
            <h2 className="text-sm font-black text-yellow-900">قائمة الغائبين — يلزم تذكيرهم</h2>
          </div>
          <div className="space-y-2">
            {recallPatients.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-sm">
                <span className="font-bold">{p.name}</span>
                <span className="text-xs text-muted">آخر زيارة: {new Date(p.lastVisit!).toLocaleDateString("ar-EG")}</span>
                <button
                  className="btn-wa btn-sm"
                  onClick={() => {
                    setModal(true);
                    setTimeout(() => {
                      const f = document.getElementById("msg-form") as HTMLFormElement | null;
                      if (f) {
                        (f.elements.namedItem("patientId") as HTMLSelectElement).value = p.id;
                        (f.elements.namedItem("template") as HTMLSelectElement).value = "RECALL";
                        setPreview(previewBody("RECALL", p.id));
                      }
                    }, 30);
                  }}
                >
                  <Icon name="message" className="h-4 w-4" /> تذكير
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {[
          { id: "all", label: "الكل" },
          { id: "recall", label: "تذكير غائب" },
          { id: "appointments", label: "تذكير موعد" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as typeof filter)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
              filter === t.id ? "bg-surface text-primary shadow" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : displayedLogs.length === 0 ? (
        <EmptyState title="لا رسائل" subtitle="ابدأ بإرسال أول تذكير" icon="message" />
      ) : (
        <div className="space-y-2">
          {displayedLogs.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-primary-soft text-primary">{l.template.replace(/_/g, " ")}</span>
                    <span className="text-sm font-bold" dir="ltr">{l.phone}</span>
                    <span className={`badge ${l.status === "SENT" ? "bg-primary-soft text-primary" : l.status === "FAILED" ? "bg-red-100 text-danger" : "bg-surface-2"}`}>
                      {l.status === "SENT" ? "تم الإرسال" : l.status === "FAILED" ? "فشل" : "معلّق"}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{l.body}</p>
                  <p className="mt-2 text-xs text-muted">{new Date(l.createdAt).toLocaleString("ar-EG")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="رسالة جديدة" wide>
        <form id="msg-form" onSubmit={send} className="space-y-3">
          {formError && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-danger">{formError}</div>}
          <Field label="المريض (اختياري)">
            <select
              name="patientId"
              className="input"
              onChange={(e) => {
                const tpl = (document.getElementsByName("template")[0] as HTMLSelectElement).value;
                setPreview(previewBody(tpl, e.target.value));
              }}
            >
              <option value="">— بدون ربط بمريض —</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="رقم الهاتف">
              <input name="phone" className="input" dir="ltr" placeholder="01xxxxxxxxx" />
            </Field>
            <Field label="القالب">
              <select
                name="template"
                className="input"
                onChange={(e) => {
                  const patientId = (document.getElementsByName("patientId")[0] as HTMLSelectElement).value;
                  setPreview(previewBody(e.target.value, patientId));
                }}
              >
                {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          {preview && (
            <Field label="معاينة الرسالة">
              <div className="rounded-xl bg-surface-2 p-3 text-sm whitespace-pre-wrap" dir="rtl">{preview}</div>
            </Field>
          )}
          <div className="rounded-lg bg-yellow-50 p-3 text-xs font-bold text-yellow-800">
            ⚠️ النظام حاليًا في وضع المحاكاة — يتم تسجيل الرسائل فقط دون إرسال فعلي عبر واتساب.
            لتفعيل الإرسال الفعلي، اربط حساب WhatsApp Business API.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
            <button type="submit" className="btn-primary">إرسال وتسجيل</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
