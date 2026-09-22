import { db } from "@/lib/db"
import { getDaysInMonth } from "@/lib/budget-engine"
import { BudgetManager } from "@/components/budgets/budget-manager"

export const dynamic = "force-dynamic"

interface BudgetsPageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const resolvedParams = await searchParams
  const now = new Date()
  const currentActualYear = now.getFullYear()
  const currentActualMonth = now.getMonth() + 1
  const currentActualDay = now.getDate()

  const month = resolvedParams.month
    ? Math.min(12, Math.max(1, parseInt(resolvedParams.month, 10)))
    : currentActualMonth
  const year = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : currentActualYear

  const isCurrentMonth = month === currentActualMonth && year === currentActualYear
  const totalDaysInMonth = getDaysInMonth(year, month)
  const currentDay = isCurrentMonth ? currentActualDay : (month < currentActualMonth && year <= currentActualYear ? totalDaysInMonth : 1)

  // Fetch only expense categories
  const categories = await db.category.findMany({
    where: { type: "EXPENSE" },
    orderBy: { name: "asc" },
  })

  // Fetch budget plans for this month
  const budgetPlans = await db.budgetPlan.findMany({
    where: { month, year },
  })

  // Calculate actual expenses for each category for this month
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0)
  const endOfMonth = new Date(year, month - 1, totalDaysInMonth, 23, 59, 59)

  const expenses = await db.transaction.findMany({
    where: {
      type: "EXPENSE",
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth,
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
      totalDaysInMonth={totalDaysInMonth}
      currentDay={currentDay}
    />
  )
}
