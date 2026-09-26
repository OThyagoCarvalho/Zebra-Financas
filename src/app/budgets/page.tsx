import { db } from "@/lib/db"
import { getCycleRange } from "@/lib/budget-engine"
import { BudgetManager } from "@/components/budgets/budget-manager"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

interface BudgetsPageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const cookieStore = await cookies()
  const cycleStartDay = parseInt(cookieStore.get("zebra_cycle_start_day")?.value || "1", 10)

  const resolvedParams = await searchParams
  const now = new Date()
  const currentActualYear = now.getFullYear()
  const currentActualMonth = now.getMonth() + 1

  const month = resolvedParams.month
    ? Math.min(12, Math.max(1, parseInt(resolvedParams.month, 10)))
    : currentActualMonth
  const year = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : currentActualYear

  const { startDate, endDate, totalDaysInCycle, cycleLabel } = getCycleRange(year, month, cycleStartDay)

  let currentDay = 1
  if (now >= startDate && now <= endDate) {
    currentDay = Math.max(1, Math.min(totalDaysInCycle, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1))
  } else if (now > endDate) {
    currentDay = totalDaysInCycle
  }

  // Fetch categories, budget plans, and category expense sums concurrently
  const [categories, budgetPlans, expenseAggregates] = await Promise.all([
    db.category.findMany({
      where: { type: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    db.budgetPlan.findMany({
      where: { month, year },
    }),
    db.transaction.groupBy({
      by: ["categoryId"],
      _sum: { amount: true },
      where: {
        type: "EXPENSE",
        status: { not: "CANCELED" },
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
  ])

  const categoryExpenses: Record<string, number> = {}
  for (const agg of expenseAggregates) {
    categoryExpenses[agg.categoryId] = agg._sum.amount || 0
  }

  return (
    <BudgetManager
      categories={categories}
      budgetPlans={budgetPlans}
      categoryExpenses={categoryExpenses}
      month={month}
      year={year}
      totalDaysInMonth={totalDaysInCycle}
      currentDay={currentDay}
      cycleStartDay={cycleStartDay}
      cycleLabel={cycleLabel}
    />
  )
}
