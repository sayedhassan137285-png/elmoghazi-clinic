import { db } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";

/** GET /api/reports?range=7d|6w|month — تقارير ومقارنات */
export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "7d";

  const now = new Date();
  let points: { start: Date; end: Date; label: string }[] = [];

  if (range === "7d") {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      points.push({ start, end, label: start.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" }) });
    }
  } else if (range === "6w") {
    for (let i = 5; i >= 0; i--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7);
      points.push({ start, end, label: `أسبوع ${6 - i}` });
    }
  } else {
    // month — daily buckets for current month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const start = new Date(now.getFullYear(), now.getMonth(), i);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      points.push({ start, end, label: `${i}` });
    }
  }

  const series = await Promise.all(points.map(async (p) => {
    const [incomeAgg, expenseAgg, visitCount, sessionCount] = await Promise.all([
      db.transaction.aggregate({ _sum: { amount: true }, where: { type: "INCOME", date: { gte: p.start, lt: p.end } } }),
      db.transaction.aggregate({ _sum: { amount: true }, where: { type: "EXPENSE", date: { gte: p.start, lt: p.end } } }),
      db.visit.count({ where: { date: { gte: p.start, lt: p.end } } }),
      db.laserSession.count({ where: { date: { gte: p.start, lt: p.end } } }),
    ]);
    return {
      label: p.label,
      income: incomeAgg._sum.amount ?? 0,
      expense: expenseAgg._sum.amount ?? 0,
      visits: visitCount,
      sessions: sessionCount,
    };
  }));

  // Top services by transactions
  const topCategories = await db.transaction.groupBy({
    by: ["category"],
    where: { type: "INCOME" },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 8,
  });

  const totals = {
    income: series.reduce((a, b) => a + b.income, 0),
    expense: series.reduce((a, b) => a + b.expense, 0),
    visits: series.reduce((a, b) => a + b.visits, 0),
    sessions: series.reduce((a, b) => a + b.sessions, 0),
  };

  return ok({ range, series, topCategories, totals });
});
