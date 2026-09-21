import { db } from "@/lib/db"
import { getDaysInMonth } from "@/lib/budget-engine"
import { BudgetManager } from "@/components/budgets/budget-manager"

export const dynamic = "force-dynamic"

export default async function BudgetsPage() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const currentDay = now.getDate()
  const totalDaysInMonth = getDaysInMonth(year, month)

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
