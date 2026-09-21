"use client"

import { ArrowDownLeft, ArrowUpRight, ShieldAlert, Sparkles, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { FinancialSummary } from "@/lib/types"

interface KpiSummaryProps {
  data: FinancialSummary
}

export function KpiSummary({ data }: KpiSummaryProps) {
  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const isNetPositive = data.netBalance >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Saldo Líquido do Mês */}
      <Card className="bg-[#121215] border border-zinc-800/90 p-4.5 rounded-xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Saldo Líquido
          </span>
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isNetPositive
                ? "bg-[#10b981]/15 text-[#10b981]"
                : "bg-[#ef4444]/15 text-[#ef4444]"
            }`}
          >
            {isNetPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        <div className="mt-3">
          <div
            className={`text-2xl font-bold font-mono tracking-tight ${
              isNetPositive ? "text-zinc-100" : "text-[#ef4444]"
            }`}
          >
            {formatCurrency(data.netBalance)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="font-mono text-zinc-500">Taxa de Poupança:</span>
            <span
              className={`font-semibold font-mono ${
                data.savingsRate > 20
                  ? "text-[#10b981]"
                  : data.savingsRate > 0
                  ? "text-[#3b82f6]"
                  : "text-[#ef4444]"
              }`}
            >
              {data.savingsRate > 0 ? `+${data.savingsRate}%` : `${data.savingsRate}%`}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Entradas (Verde - Recorrentes e Avulsas) */}
      <Card className="bg-[#121215] border border-zinc-800/90 p-4.5 rounded-xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Entradas Totais
          </span>
          <div className="w-6 h-6 rounded-md bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#10b981]">
            +{formatCurrency(data.totalIncome)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-zinc-800/60">
            <span className="text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              Fixas: <strong className="text-zinc-200">{formatCurrency(data.recurringIncome)}</strong>
            </span>
            <span className="text-zinc-500">
              Avulsas: <strong className="text-zinc-300">{formatCurrency(data.oneOffIncome)}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Despesas (Vermelho - Recorrentes e Avulsas) */}
      <Card className="bg-[#121215] border border-zinc-800/90 p-4.5 rounded-xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Despesas Totais
          </span>
          <div className="w-6 h-6 rounded-md bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-[#ef4444]">
            -{formatCurrency(data.totalExpense)}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-zinc-800/60">
            <span className="text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              Fixas: <strong className="text-zinc-200">{formatCurrency(data.recurringExpense)}</strong>
            </span>
            <span className="text-zinc-500">
              Avulsas: <strong className="text-zinc-300">{formatCurrency(data.oneOffExpense)}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Orçamento Planejado (Azul / Amarelo / Vermelho) */}
      <Card className="bg-[#121215] border border-zinc-800/90 p-4.5 rounded-xl shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            Orçamento Comprometido
          </span>
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              data.budgetAdherencePercent > 100
                ? "bg-[#ef4444]/15 text-[#ef4444]"
                : data.budgetAdherencePercent > 80
                ? "bg-[#f59e0b]/15 text-[#f59e0b]"
                : "bg-[#3b82f6]/15 text-[#3b82f6]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-zinc-100 flex items-baseline gap-2">
            <span>{data.budgetAdherencePercent}%</span>
            <span className="text-xs text-zinc-500 font-normal">
              de {formatCurrency(data.totalBudgetPlanned)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono pt-2 border-t border-zinc-800/60">
            <span className="text-zinc-400">
              Consumido: <strong className="text-zinc-200">{formatCurrency(data.totalBudgetSpent)}</strong>
            </span>
            <span
              className={`font-semibold ${
                data.totalBudgetPlanned - data.totalBudgetSpent < 0
                  ? "text-[#ef4444]"
                  : "text-[#10b981]"
              }`}
            >
              Restante: {formatCurrency(Math.max(0, data.totalBudgetPlanned - data.totalBudgetSpent))}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
