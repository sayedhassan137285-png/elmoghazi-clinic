"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";

type Point = { label: string; income: number; expense: number; visits: number; sessions: number };
type TopCat = { category: string; _sum: { amount: number | null } };

const money = (v: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(v || 0);

const RANGES = [
  { id: "7d", label: "آخر 7 أيام" },
  { id: "6w", label: "آخر 6 أسابيع" },
  { id: "month", label: "الشهر الحالي" },
];

export default function ReportsPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<{
    series: Point[]; topCategories: TopCat[]; totals: { income: number; expense: number; visits: number; sessions: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/reports?range=${range}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setData({ series: d.series, topCategories: d.topCategories, totals: d.totals });
    }
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const maxIncome = data ? Math.max(...data.series.map((s) => s.income), 1) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black">التقارير</h1>
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                range === r.id ? "bg-surface text-primary shadow" : "text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Spinner /> : !data ? (
        <EmptyState title="لا بيانات" subtitle="تعذر تحميل التقارير" icon="chart" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="card p-4">
              <span className="text-xs font-bold text-muted">إجمالي الإيرادات</span>
              <b className="mt-1 block text-xl text-primary">{money(data.totals.income)} ج.م</b>
            </div>
            <div className="card p-4">
              <span className="text-xs font-bold text-muted">إجمالي المصروفات</span>
              <b className="mt-1 block text-xl text-danger">{money(data.totals.expense)} ج.م</b>
            </div>
            <div className="card p-4">
              <span className="text-xs font-bold text-muted">عدد الزيارات</span>
              <b className="mt-1 block text-xl">{data.totals.visits}</b>
            </div>
            <div className="card p-4">
              <span className="text-xs font-bold text-muted">جلسات الليزر</span>
              <b className="mt-1 block text-xl">{data.totals.sessions}</b>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-sm font-black text-muted">مقارنة الإيرادات والمصروفات</h2>
            <div className="space-y-2">
              {data.series.map((p, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_80px] items-center gap-3 text-sm">
                  <span className="text-xs font-bold text-muted">{p.label}</span>
                  <div className="relative h-6 rounded-lg bg-surface-2">
                    <div
                      className="absolute inset-y-0 start-0 rounded-lg"
                      style={{ width: `${(p.income / maxIncome) * 100}%`, background: "var(--primary)" }}
                      title={`إيراد: ${money(p.income)}`}
                    />
                    <div
                      className="absolute inset-y-0 start-0 rounded-lg opacity-50"
                      style={{ width: `${(p.expense / maxIncome) * 100}%`, background: "var(--danger)" }}
                      title={`مصروف: ${money(p.expense)}`}
                    />
                  </div>
                  <span className="text-end text-xs font-bold">{money(p.income - p.expense)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded" style={{ background: "var(--primary)" }} /> إيراد</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded opacity-50" style={{ background: "var(--danger)" }} /> مصروف</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-5">
              <h2 className="mb-4 text-sm font-black text-muted">عدد الزيارات والجلسات</h2>
              <div className="space-y-2">
                {data.series.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-20 text-xs font-bold text-muted">{p.label}</span>
                    <div className="flex flex-1 gap-2">
                      <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{p.visits} زيارة</span>
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-bold">{p.sessions} جلسة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h2 className="mb-4 text-sm font-black text-muted">أعلى التصنيفات دخلًا</h2>
              {data.topCategories.length === 0 ? (
                <p className="text-sm text-muted">لا توجد بيانات.</p>
              ) : (
                <div className="space-y-2">
                  {data.topCategories.map((c, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                      <span className="font-bold">{c.category}</span>
                      <span className="font-bold text-primary">{money(c._sum.amount ?? 0)} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
