"use client"

import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"

interface CategoryBreakdownProps {
  transactions: any[]
}

const ACCENT_COLORS = [
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#f59e0b", // Yellow
  "#10b981", // Green
  "#a855f7", // Purple
  "#71717a", // Zinc
]

export function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  const { data, config, totalExpense } = useMemo(() => {
    const expenseTx = transactions.filter((t) => t.type === "EXPENSE")
    const map: Record<string, number> = {}

    let total = 0
    for (const t of expenseTx) {
      const catName = t.category?.name || "Outros"
      map[catName] = (map[catName] || 0) + t.amount
      total += t.amount
    }

    const items = Object.entries(map)
      .map(([name, value], index) => ({
        name,
        value: Math.round(value * 100) / 100,
        fill: ACCENT_COLORS[index % ACCENT_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)

    const cfg: ChartConfig = {}
    items.forEach((item, idx) => {
      cfg[item.name] = {
        label: item.name,
        color: item.fill,
      }
    })

    return { data: items, config: cfg, totalExpense: total }
  }, [transactions])

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <Card className="bg-[#121215] border border-zinc-800 rounded-xl">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
          Distribuição por Categoria
        </CardTitle>
        <CardDescription className="text-[11px] text-zinc-400">
          Total de despesas: {formatBRL(totalExpense)}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <div className="h-[210px] flex items-center justify-center text-xs font-mono text-zinc-500">
            Sem despesas registradas
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
            {/* Donut chart */}
            <div className="h-[180px] w-full">
              <ChartContainer config={config} className="h-full w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            {/* Compact Legend */}
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {data.map((item) => {
                const pct = totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-[11px] font-mono py-1 border-b border-zinc-800/40"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-zinc-300 font-sans truncate max-w-[110px]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 font-bold">{formatBRL(item.value)}</span>
                      <span className="text-zinc-500 text-[10px] min-w-7 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
