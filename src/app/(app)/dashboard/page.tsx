"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Spinner } from "@/components/ui";
import { useUser } from "@/components/app-shell";

type Dash = {
  stats: {
    totalPatients: number; todayVisits: number; activeLaser: number;
    waiting: number; monthIncome: number; monthExpense: number;
  };
  recentTransactions: {
    id: string; type: string; category: string; amount: number;
    date: string; description?: string | null;
    patient?: { name: string } | null;
  }[];
  waitingList: { id: string; patientName: string; priority: number; createdAt: string }[];
};

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(v);

const QUICK = [
  { href: "/patients", icon: "patients", label: "المرضى", perm: "patients" },
  { href: "/waiting", icon: "clock", label: "الانتظار", perm: "waiting" },
  { href: "/appointments", icon: "calendar", label: "المواعيد", perm: "appointments" },
  { href: "/laser", icon: "zap", label: "الليزر", perm: "laser" },
  { href: "/prescriptions", icon: "file", label: "روشتة", perm: "prescriptions" },
  { href: "/reports", icon: "chart", label: "التقارير", perm: "reports" },
];

const PRIORITY_LABEL: Record<number, string> = { 1: "عالي", 2: "عادي", 3: "منخفض" };

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error) return <Spinner label="تعذر تحميل البيانات — حدّث الصفحة" />;
  if (!data) return <Spinner />;

  const s = data.stats;
  const cards = [
    { label: "إجمالي المرضى", value: s.totalPatients, icon: "patients" },
    { label: "زيارات اليوم", value: s.todayVisits, icon: "calendar" },
    { label: "إيراد الشهر", value: money(s.monthIncome), icon: "wallet" },
    { label: "جلسات ليزر نشطة", value: s.activeLaser, icon: "zap" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted">{c.label}</p>
                <p className="mt-2 text-2xl font-black">{c.value}</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={c.icon} className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-black text-muted">الإجراءات السريعة</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {QUICK.filter((q) => user?.role === "DOCTOR" || user?.perms.includes(q.perm)).map((q) => (
            <Link key={q.href} href={q.href}
              className="card flex flex-col items-center gap-2 p-4 transition hover:shadow-md">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon name={q.icon} className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-black">آخر المعاملات المالية</h2>
          </div>
          {data.recentTransactions.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">لا توجد معاملات بعد</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">النوع</th>
                  <th className="table-th">التصنيف</th>
                  <th className="table-th">المبلغ</th>
                  <th className="table-th">المريض</th>
                  <th className="table-th">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t) => (
                  <tr key={t.id} className="border-t border-line hover:bg-surface-2/50">
                    <td className="table-td">
                      <span className={`badge ${t.type === "INCOME" ? "bg-primary-soft text-primary" : "bg-red-100 text-danger"}`}>
                        {t.type === "INCOME" ? "إيراد" : "مصروف"}
                      </span>
                    </td>
                    <td className="table-td">{t.category}</td>
                    <td className="table-td font-black">{money(t.amount)}</td>
                    <td className="table-td text-muted">{t.patient?.name || "—"}</td>
                    <td className="table-td text-muted">
                      {new Date(t.date).toLocaleDateString("ar-EG")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-black">قائمة الانتظار</h2>
            <span className="badge bg-primary-soft text-primary">{data.waitingList.length}</span>
          </div>
          {data.waitingList.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">لا يوجد أحد في الانتظار</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.waitingList.map((w) => (
                <li key={w.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-bold">{w.patientName}</span>
                  <span className="badge bg-surface-2 text-muted">{PRIORITY_LABEL[w.priority] ?? "عادي"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
