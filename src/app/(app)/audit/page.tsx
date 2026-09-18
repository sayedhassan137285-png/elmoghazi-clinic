"use client";

import { useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";

type Log = {
  id: string; userName?: string | null; userRole?: string | null;
  action: string; description?: string | null; createdAt: string;
};

const ACT: Record<string, [string, string]> = {
  create: ["إضافة", "bg-primary-soft text-primary"],
  update: ["تعديل", "bg-[#fdf3d7] text-[#8a6d1a]"],
  delete: ["حذف", "bg-red-100 text-danger"],
  login: ["دخول", "bg-primary-soft text-primary"],
  login_failed: ["دخول فاشل", "bg-red-100 text-danger"],
  logout: ["خروج", "bg-surface-2 text-muted"],
};

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setLogs(d.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">سجل النشاط</h1>
      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState title="السجل فارغ" icon="shield" />
      ) : (
        <div className="card divide-y divide-line">
          {logs.map((a) => {
            const info = ACT[a.action] || [a.action, "bg-surface-2 text-muted"];
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{a.userName || "—"}</b>
                  <span className={`badge ${info[1]}`}>{info[0]}</span>
                  <small className="text-muted">{a.description || "—"}</small>
                </div>
                <small className="text-muted">
                  {new Date(a.createdAt).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
