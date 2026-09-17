import { db } from "@/lib/db";
import { ok, withAuth } from "@/lib/api";

/** GET /api/dashboard — ملخص اليوم (stats + آخر المعاملات + الانتظار) */
export const GET = withAuth(async () => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPatients,
    todayVisits,
    activeLaser,
    waiting,
    monthIncome,
    monthExpense,
    recentTransactions,
    waitingList,
  ] = await Promise.all([
    db.patient.count(),
    db.visit.count({ where: { date: { gte: startToday } } }),
    db.laserRecord.count({ where: { status: "ACTIVE" } }),
    db.waitingListEntry.count({ where: { status: "WAITING" } }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME", date: { gte: startMonth } },
    }),
    db.transaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE", date: { gte: startMonth } },
    }),
    db.transaction.findMany({
      orderBy: { date: "desc" },
      take: 8,
      include: { patient: { select: { name: true } } },
    }),
    db.waitingListEntry.findMany({
      where: { status: "WAITING" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 6,
    }),
  ]);

  return ok({
    stats: {
      totalPatients,
      todayVisits,
      activeLaser,
      waiting,
      monthIncome: monthIncome._sum.amount ?? 0,
      monthExpense: monthExpense._sum.amount ?? 0,
    },
    recentTransactions,
    waitingList,
  });
});
