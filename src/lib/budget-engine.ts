import { db } from "./db"
import { BudgetPacing, FinancialSummary } from "./types"

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export async function getFinancialData(
  year: number,
  month: number,
  cutoffDay?: number
): Promise<FinancialSummary> {
  const totalDaysInMonth = getDaysInMonth(year, month)
  const currentDay = new Date().getDate()
  const effectiveCutoff = cutoffDay
    ? Math.min(cutoffDay, totalDaysInMonth)
    : Math.min(currentDay, totalDaysInMonth)

  // Start & End date for the entire month
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0)
  const endOfMonth = new Date(year, month - 1, totalDaysInMonth, 23, 59, 59)

  // Cutoff date for expenses/incomes up to that day
  const cutoffDate = new Date(year, month - 1, effectiveCutoff, 23, 59, 59)

  // Fetch transactions for the month
  const transactions = await db.transaction.findMany({
    where: {
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      dueDate: "desc",
    },
  })

  // Filter transactions up to the cutoff date for current budget pacing
  const transactionsUpToCutoff = transactions.filter(
    (t) => new Date(t.dueDate) <= cutoffDate
  )

  // Incomes calculations (Total month and up to cutoff)
  let totalIncome = 0
  let recurringIncome = 0
  let oneOffIncome = 0

  // Expenses calculations
  let totalExpense = 0
  let recurringExpense = 0
  let oneOffExpense = 0

  for (const t of transactionsUpToCutoff) {
    if (t.type === "INCOME") {
      totalIncome += t.amount
      if (t.isRecurring) {
        recurringIncome += t.amount
      } else {
        oneOffIncome += t.amount
      }
    } else if (t.type === "EXPENSE") {
      totalExpense += t.amount
      if (t.isRecurring) {
        recurringExpense += t.amount
      } else {
        oneOffExpense += t.amount
      }
    }
  }

  // Fetch Budget Plans for this month
  const budgetPlans = await db.budgetPlan.findMany({
    where: {
      month,
      year,
    },
    include: {
      category: true,
    },
  })

  // Calculate budget pacing
  let totalBudgetPlanned = 0
  let totalBudgetSpent = 0

  const timeRatio = effectiveCutoff / totalDaysInMonth

  const budgets: BudgetPacing[] = budgetPlans.map((bp) => {
    // Sum expenses for this category up to cutoff day
    const catExpenses = transactionsUpToCutoff
      .filter((t) => t.type === "EXPENSE" && t.categoryId === bp.categoryId)
      .reduce((sum, t) => sum + t.amount, 0)

    totalBudgetPlanned += bp.targetAmount
    totalBudgetSpent += catExpenses

    const percentSpent = bp.targetAmount > 0 ? (catExpenses / bp.targetAmount) * 100 : 0
    const remainingAmount = Math.max(0, bp.targetAmount - catExpenses)
    const dailyBudget = bp.targetAmount / totalDaysInMonth
    const avgDailySpent = effectiveCutoff > 0 ? catExpenses / effectiveCutoff : 0
    const projectedSpend = avgDailySpent * totalDaysInMonth

    let pacingStatus: "SAFE" | "WARNING" | "OVER" = "SAFE"
    if (catExpenses > bp.targetAmount) {
      pacingStatus = "OVER"
    } else if (percentSpent / 100 > timeRatio + 0.15 || percentSpent >= bp.alertThreshold * 100) {
      pacingStatus = "WARNING"
    }

    return {
      categoryId: bp.categoryId,
      categoryName: bp.category.name,
      targetAmount: bp.targetAmount,
      spentToDate: catExpenses,
      percentSpent: Math.round(percentSpent * 10) / 10,
      dailyBudget: Math.round(dailyBudget * 100) / 100,
      projectedSpend: Math.round(projectedSpend * 100) / 100,
      pacingStatus,
      color: bp.category.color || "blue",
      remainingAmount: Math.round(remainingAmount * 100) / 100,
    }
  })

  const netBalance = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0
  const budgetAdherencePercent =
    totalBudgetPlanned > 0
      ? Math.round((totalBudgetSpent / totalBudgetPlanned) * 1000) / 10
      : 0

  return {
    month,
    year,
    cutoffDay: effectiveCutoff,
    totalDaysInMonth,
    totalIncome: Math.round(totalIncome * 100) / 100,
    recurringIncome: Math.round(recurringIncome * 100) / 100,
    oneOffIncome: Math.round(oneOffIncome * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    recurringExpense: Math.round(recurringExpense * 100) / 100,
    oneOffExpense: Math.round(oneOffExpense * 100) / 100,
    netBalance: Math.round(netBalance * 100) / 100,
    savingsRate: Math.round(savingsRate * 10) / 10,
    totalBudgetPlanned: Math.round(totalBudgetPlanned * 100) / 100,
    totalBudgetSpent: Math.round(totalBudgetSpent * 100) / 100,
    budgetAdherencePercent,
    budgets,
    recentTransactions: transactions.slice(0, 10),
  }
}
