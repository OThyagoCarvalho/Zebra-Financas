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

  // Fetch only expense categories
  const categories = await db.category.findMany({
    where: { type: "EXPENSE" },
    orderBy: { name: "asc" },
  })

  // Fetch budget plans for this month
  const budgetPlans = await db.budgetPlan.findMany({
    where: { month, year },
  })

  // Calculate actual expenses for each category for this financial cycle
  const expenses = await db.transaction.findMany({
    where: {
      type: "EXPENSE",
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
  })

  const categoryExpenses: Record<string, number> = {}
  for (const exp of expenses) {
    categoryExpenses[exp.categoryId] = (categoryExpenses[exp.categoryId] || 0) + exp.amount
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
