"use client"

import { AlertTriangle, CheckCircle2, ChevronRight, Flame, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BudgetPacing } from "@/lib/types"
import Link from "next/link"

interface BudgetProgressProps {
  budgets: BudgetPacing[]
  cutoffDay: number
  totalDaysInMonth: number
}

export function BudgetProgress({ budgets, cutoffDay, totalDaysInMonth }: BudgetProgressProps) {
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const timeRatioPct = Math.round((cutoffDay / totalDaysInMonth) * 100)

  return (
    <Card className="bg-[#121215] border border-zinc-800 rounded-xl">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <span>Planejamento de Orçamentos</span>
            <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Até Dia {cutoffDay}
            </span>
          </CardTitle>
          <CardDescription className="text-[11px] text-zinc-400 mt-0.5">
            Metas mensais por categoria vs despesas acumuladas na competência
          </CardDescription>
        </div>
        <Link
          href="/budgets"
          className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-0.5"
        >
          <span>Gerenciar</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-4 pt-1 space-y-4">
        {budgets.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs font-mono">
            Nenhum teto de orçamento cadastrado para este mês.
          </div>
        ) : (
          budgets.map((bp) => {
            const isOver = bp.pacingStatus === "OVER"
            const isWarning = bp.pacingStatus === "WARNING"

            // Accent color based on status
            const progressColor = isOver
              ? "bg-[#ef4444]"
              : isWarning
              ? "bg-[#f59e0b]"
              : "bg-[#10b981]"

            const statusBadge = isOver ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">
                <Flame className="w-2.5 h-2.5" />
                Estourou
              </span>
            ) : isWarning ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30">
                <AlertTriangle className="w-2.5 h-2.5" />
                Ritmo Alto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                <CheckCircle2 className="w-2.5 h-2.5" />
                No Ritmo
              </span>
            )

            return (
              <div
                key={bp.categoryId}
                className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
              >
                {/* Header line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {bp.categoryName}
                    </span>
                    {statusBadge}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-zinc-100">
                      {formatBRL(bp.spentToDate)}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 ml-1">
                      / {formatBRL(bp.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Relative progress bar with day marker */}
                <div className="mt-2.5 relative">
                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${Math.min(bp.percentSpent, 100)}%` }}
                    />
                  </div>

                  {/* Marker for current day of month ratio */}
                  <div
                    className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-zinc-400 z-10 pointer-events-none"
                    style={{ left: `${Math.min(timeRatioPct, 100)}%` }}
                    title={`Ponto temporal do mês: Dia ${cutoffDay} (${timeRatioPct}%)`}
                  />
                </div>

                {/* Footer stats */}
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>
                    Consumido: <strong className="text-zinc-200">{bp.percentSpent}%</strong>
                  </span>
                  <span>
                    Projeção Mês:{" "}
                    <strong
                      className={
                        bp.projectedSpend > bp.targetAmount ? "text-[#ef4444]" : "text-zinc-300"
                      }
                    >
                      {formatBRL(bp.projectedSpend)}
                    </strong>
                  </span>
                  <span>
                    Disponível:{" "}
                    <strong className={isOver ? "text-[#ef4444]" : "text-[#10b981]"}>
                      {formatBRL(bp.remainingAmount)}
                    </strong>
                  </span>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
