export type TransactionType = "INCOME" | "EXPENSE"
export type TransactionStatus = "PENDING" | "COMPLETED"
export type RecurrenceRule = "MONTHLY" | "WEEKLY" | "YEARLY"
export type AccentColor = "green" | "red" | "yellow" | "blue"

export interface CategoryWithStats {
  id: string
  name: string
  type: TransactionType
  icon: string | null
  color: AccentColor | string | null
  budgetTarget?: number
  spentAmount: number
  budgetPercent: number
  pacingStatus: "SAFE" | "WARNING" | "OVER"
}

export interface BudgetPacing {
  categoryId: string
  categoryName: string
  targetAmount: number
  spentToDate: number
  percentSpent: number
  dailyBudget: number
  projectedSpend: number
  pacingStatus: "SAFE" | "WARNING" | "OVER"
  color: AccentColor | string
  remainingAmount: number
}

export interface FinancialSummary {
  month: number
  year: number
  cutoffDay: number
  totalDaysInMonth: number
  // Incomes
  totalIncome: number
  recurringIncome: number
  oneOffIncome: number
  // Expenses
  totalExpense: number
  recurringExpense: number
  oneOffExpense: number
  // Balances
  netBalance: number
  savingsRate: number
  // Budgets
  totalBudgetPlanned: number
  totalBudgetSpent: number
  budgetAdherencePercent: number
  // Lists
  budgets: BudgetPacing[]
  recentTransactions: any[]
}
