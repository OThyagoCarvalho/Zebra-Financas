"use client"

import { useState } from "react"
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Edit3, Flame, Plus, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { upsertBudgetPlanAction } from "@/actions/finance-actions"
import { useRouter } from "next/navigation"

interface BudgetManagerProps {
  categories: any[]
  budgetPlans: any[]
  categoryExpenses: Record<string, number>
  month: number
  year: number
  totalDaysInMonth: number
  currentDay: number
}

export function BudgetManager({
  categories,
  budgetPlans,
  categoryExpenses,
  month,
  year,
  totalDaysInMonth,
  currentDay,
}: BudgetManagerProps) {
  const router = useRouter()
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [targetAmount, setTargetAmount] = useState("")
  const [saving, setSaving] = useState(false)

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Create a fast map of categoryId -> targetAmount
  const planMap: Record<string, number> = {}
  for (const bp of budgetPlans) {
    planMap[bp.categoryId] = bp.targetAmount
  }

  const handleOpenEdit = (category: any, currentTarget: number) => {
    setEditingCategory(category)
    setTargetAmount(currentTarget > 0 ? String(currentTarget) : "")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory) return

    setSaving(true)
    try {
      const amount = parseFloat(targetAmount.replace(",", ".")) || 0
      await upsertBudgetPlanAction(editingCategory.id, month, year, amount)
      setEditingCategory(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const timeRatio = currentDay / totalDaysInMonth

  // Calculate totals
  let totalPlanned = 0
  let totalSpent = 0

  for (const cat of categories) {
    const planned = planMap[cat.id] || 0
    const spent = categoryExpenses[cat.id] || 0
    totalPlanned += planned
    totalSpent += spent
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Planejamento de Orçamentos Mensais</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Defina tetos por categoria e monitore o ritmo de despesas ao longo dos {totalDaysInMonth} dias do mês
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#121215] border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300">
            Competência: <strong className="text-white">{String(month).padStart(2, "0")}/{year}</strong>
          </div>
        </div>
      </div>

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-400 uppercase">Teto Total Planejado</span>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
            {formatBRL(totalPlanned)}
          </div>
        </Card>

        <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-400 uppercase">Gasto Real até o Dia {currentDay}</span>
          <div className="text-2xl font-bold font-mono text-[#ef4444] mt-1">
            {formatBRL(totalSpent)}
          </div>
        </Card>

        <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-400 uppercase">Margem Disponível</span>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              totalPlanned - totalSpent >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
            }`}
          >
            {formatBRL(Math.max(0, totalPlanned - totalSpent))}
          </div>
        </Card>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const target = planMap[cat.id] || 0
          const spent = categoryExpenses[cat.id] || 0
          const percent = target > 0 ? (spent / target) * 100 : 0
          const remaining = Math.max(0, target - spent)
          const dailyAvg = currentDay > 0 ? spent / currentDay : 0
          const projected = dailyAvg * totalDaysInMonth

          const isOver = spent > target && target > 0
          const isWarning = target > 0 && (percent / 100 > timeRatio + 0.15 || percent >= 80) && !isOver

          return (
            <Card
              key={cat.id}
              className="bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition-all rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-100 block">
                    {cat.name}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {target > 0 ? `Meta: ${formatBRL(target)}` : "Sem teto definido"}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleOpenEdit(cat, target)}
                  className="h-7 text-xs px-2 text-zinc-400 hover:text-white"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  <span>Ajustar</span>
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400">
                      Gasto: <strong className="text-white">{formatBRL(spent)}</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        isOver
                          ? "text-[#ef4444]"
                          : isWarning
                          ? "text-[#f59e0b]"
                          : "text-[#10b981]"
                      }`}
                    >
                      {target > 0 ? `${Math.round(percent)}%` : "0%"}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver
                          ? "bg-[#ef4444]"
                          : isWarning
                          ? "bg-[#f59e0b]"
                          : "bg-[#10b981]"
                      }`}
                      style={{ width: `${target > 0 ? Math.min(percent, 100) : 0}%` }}
                    />
                  </div>
                </div>

                {/* Submetrics */}
                <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-zinc-500 block">Projeção Fim do Mês:</span>
                    <span className={projected > target && target > 0 ? "text-[#ef4444] font-bold" : "text-zinc-300"}>
                      {formatBRL(projected)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block">Saldo Restante:</span>
                    <span className={isOver ? "text-[#ef4444] font-bold" : "text-[#10b981] font-bold"}>
                      {formatBRL(remaining)}
                    </span>
                  </div>
                </div>

                {/* Status Alert Badge */}
                <div className="pt-1">
                  {isOver ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 px-2 py-1 rounded">
                      <Flame className="w-3 h-3" />
                      <span>Orçamento ultrapassado em {formatBRL(spent - target)}</span>
                    </div>
                  ) : isWarning ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2 py-1 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Ritmo acelerado para o dia {currentDay}</span>
                    </div>
                  ) : target > 0 ? (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 px-2 py-1 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Dentro do limite planejado</span>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Edit Budget Target Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="bg-[#121215] border border-zinc-800 text-white sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Teto de Orçamento: {editingCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Defina o limite mensal máximo desejado para esta categoria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-zinc-300">Valor Teto (R$)</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">
                  R$
                </span>
                <Input
                  type="text"
                  required
                  placeholder="Ex: 2000,00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white font-mono text-base font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCategory(null)}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold px-4"
              >
                Salvar Meta
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
