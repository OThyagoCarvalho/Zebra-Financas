import { db } from "./db"
import { BudgetPacing, FinancialSummary } from "./types"

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function getCycleRange(year: number, month: number, cycleStartDay: number = 1) {
  const clamped = Math.min(28, Math.max(1, Math.round(cycleStartDay || 1)))

  if (clamped <= 1) {
    const totalDays = new Date(year, month, 0).getDate()
    const startDate = new Date(year, month - 1, 1, 0, 0, 0)
    const endDate = new Date(year, month - 1, totalDays, 23, 59, 59)
    return {
      startDate,
      endDate,
      totalDaysInCycle: totalDays,
      cycleStartDay: 1,
      isCustomCycle: false,
      cycleLabel: `01/${String(month).padStart(2, "0")} a ${String(totalDays).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
    }
  }

  // Custom cycle starts on day `clamped` of (year, month - 1)
  const startDate = new Date(year, month - 1, clamped, 0, 0, 0)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const endDate = new Date(nextYear, nextMonth - 1, clamped - 1, 23, 59, 59)

  const diffMs = endDate.getTime() - startDate.getTime()
  const totalDaysInCycle = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1

  const startFormatted = `${String(clamped).padStart(2, "0")}/${String(month).padStart(2, "0")}`
  const endFormatted = `${String(clamped - 1).padStart(2, "0")}/${String(nextMonth).padStart(2, "0")}`

  return {
    startDate,
    endDate,
    totalDaysInCycle,
    cycleStartDay: clamped,
    isCustomCycle: true,
    cycleLabel: `${startFormatted} a ${endFormatted}`,
  }
}

export async function getFinancialData(
  year: number,
  month: number,
  cutoffDay?: number,
  cycleStartDay: number = 1
): Promise<FinancialSummary> {
  const { startDate, endDate, totalDaysInCycle, cycleLabel, cycleStartDay: resolvedCycleDay } = getCycleRange(year, month, cycleStartDay)
  const totalDaysInMonth = totalDaysInCycle

  // Determine current cycle day
  const now = new Date()
  let elapsedDays = 1
  if (now >= startDate && now <= endDate) {
    elapsedDays = Math.max(1, Math.min(totalDaysInCycle, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1))
  } else if (now > endDate) {
    elapsedDays = totalDaysInCycle
  }

  const effectiveCutoff = cutoffDay
    ? Math.min(cutoffDay, totalDaysInCycle)
    : elapsedDays

  // Cutoff date for expenses/incomes up to that day
  const cutoffDate = new Date(startDate.getTime() + (effectiveCutoff - 1) * 24 * 60 * 60 * 1000 + 23 * 3600000 + 59 * 60000 + 59000)

  // Fetch transactions for the cycle (excluding canceled ones)
  const transactions = await db.transaction.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        not: "CANCELED",
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
    cycleStartDay: resolvedCycleDay,
    totalDaysInCycle,
    currentCycleDay: effectiveCutoff,
    cycleLabel,
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
