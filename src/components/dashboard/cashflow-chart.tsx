"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"

interface CashflowChartProps {
  transactions: any[]
  cutoffDay: number
  totalDaysInMonth: number
  month: number
  year: number
}

const chartConfig = {
  income: {
    label: "Entradas Acumuladas",
    color: "#10b981", // Emerald Green
  },
  expense: {
    label: "Despesas Acumuladas",
    color: "#ef4444", // Rose Red
  },
} satisfies ChartConfig

export function CashflowChart({
  transactions,
  cutoffDay,
  totalDaysInMonth,
  month,
  year,
}: CashflowChartProps) {
  const chartData = useMemo(() => {
    // Generate day by day data points from day 1 to cutoffDay
    const dataPoints: { day: string; income: number; expense: number }[] = []
    let cumulativeIncome = 0
    let cumulativeExpense = 0

    for (let d = 1; d <= cutoffDay; d++) {
      // Find transactions on day d
      const dayTransactions = transactions.filter((t) => {
        const tDate = new Date(t.dueDate)
        return tDate.getDate() === d
      })

      for (const t of dayTransactions) {
        if (t.type === "INCOME") {
          cumulativeIncome += t.amount
        } else if (t.type === "EXPENSE") {
          cumulativeExpense += t.amount
        }
      }

      dataPoints.push({
        day: `D${d}`,
        income: Math.round(cumulativeIncome),
        expense: Math.round(cumulativeExpense),
      })
    }

    return dataPoints
  }, [transactions, cutoffDay])

  return (
    <Card className="bg-[#121215] border border-zinc-800 rounded-xl">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Fluxo de Caixa Acumulado
          </CardTitle>
          <CardDescription className="text-[11px] text-zinc-400">
            Comparativo entre Entradas vs Despesas até o dia {cutoffDay}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" />
            <span className="text-zinc-300">Entradas</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444]" />
            <span className="text-zinc-300">Despesas</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div className="h-[230px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis
                dataKey="day"
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$${val >= 1000 ? (val / 1000).toFixed(0) + "k" : val}`}
              />
              <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fillIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#fillExpense)"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
