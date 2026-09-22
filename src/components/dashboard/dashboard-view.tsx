"use client"

import { useState } from "react"
import { FinancialSummary } from "@/lib/types"
import { KpiSummary } from "./kpi-summary"
import { PacingControls } from "./pacing-controls"
import { CashflowChart } from "./cashflow-chart"
import { BudgetProgress } from "./budget-progress"
import { CategoryBreakdown } from "./category-breakdown"
import { RecentTransactions } from "./recent-transactions"
import { getFinancialOverviewAction } from "@/actions/finance-actions"

interface DashboardViewProps {
  initialData: FinancialSummary
  allTransactions: any[]
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function DashboardView({ initialData, allTransactions }: DashboardViewProps) {
  const [data, setData] = useState<FinancialSummary>(initialData)
  const [cutoffDay, setCutoffDay] = useState<number>(initialData.cutoffDay)
  const [loading, setLoading] = useState(false)

  const handleCutoffChange = async (newDay: number) => {
    setCutoffDay(newDay)
    setLoading(true)
    try {
      const updated = await getFinancialOverviewAction(data.year, data.month, newDay)
      setData(updated)
    } finally {
      setLoading(false)
    }
  }

  const reloadData = async () => {
    setLoading(true)
    try {
      const updated = await getFinancialOverviewAction(data.year, data.month, cutoffDay)
      setData(updated)
    } finally {
      setLoading(false)
    }
  }

  const currentMonthName = `${MONTH_NAMES[data.month - 1]} ${data.year}`

  return (
    <div className="space-y-5">
      {/* 1. Header & Temporal Pacing Controls */}
      <PacingControls
        cutoffDay={cutoffDay}
        totalDaysInMonth={data.totalDaysInMonth}
        onCutoffChange={handleCutoffChange}
        currentMonthName={currentMonthName}
        cycleStartDay={data.cycleStartDay}
        cycleLabel={data.cycleLabel}
      />

      {/* 2. Top KPI Summary */}
      <KpiSummary data={data} />

      {/* 3. Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Cashflow Area Chart & Category Distribution */}
        <div className="lg:col-span-2 space-y-5">
          <CashflowChart
            transactions={allTransactions}
            cutoffDay={cutoffDay}
            totalDaysInMonth={data.totalDaysInMonth}
            month={data.month}
            year={data.year}
          />
          <RecentTransactions
            transactions={data.recentTransactions}
            onUpdate={reloadData}
          />
        </div>

        {/* Right 1 Col: Budget Planning Pacing & Category Breakdown */}
        <div className="space-y-5">
          <BudgetProgress
            budgets={data.budgets}
            cutoffDay={cutoffDay}
            totalDaysInMonth={data.totalDaysInMonth}
          />
          <CategoryBreakdown transactions={allTransactions} />
        </div>
      </div>
    </div>
  )
}
