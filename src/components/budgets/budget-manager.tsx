"use client"

import { useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Flame,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  upsertBudgetPlanAction,
  createCategoryAction,
  copyBudgetPlansFromPreviousMonthAction,
  deleteCategoryAction,
} from "@/actions/finance-actions"
import { useRouter } from "next/navigation"
import { CycleSettingsDialog } from "@/components/layout/cycle-settings-dialog"

interface BudgetManagerProps {
  categories: any[]
  budgetPlans: any[]
  categoryExpenses: Record<string, number>
  month: number
  year: number
  totalDaysInMonth: number
  currentDay: number
  cycleStartDay?: number
  cycleLabel?: string
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const COLOR_OPTIONS = [
  { label: "Vermelho", value: "red", bg: "bg-red-500" },
  { label: "Amarelo", value: "yellow", bg: "bg-yellow-500" },
  { label: "Azul", value: "blue", bg: "bg-blue-500" },
  { label: "Verde", value: "green", bg: "bg-emerald-500" },
  { label: "Roxo", value: "purple", bg: "bg-purple-500" },
]

export function BudgetManager({
  categories,
  budgetPlans,
  categoryExpenses,
  month,
  year,
  totalDaysInMonth,
  currentDay,
  cycleStartDay = 1,
  cycleLabel,
}: BudgetManagerProps) {
  const router = useRouter()

  // State for Editing an existing budget target
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [targetAmount, setTargetAmount] = useState("")
  const [saving, setSaving] = useState(false)

  // State for Creating a brand new category & budget
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("blue")
  const [newCatInitialBudget, setNewCatInitialBudget] = useState("")
  const [creatingCategory, setCreatingCategory] = useState(false)

  // State for Copying previous month
  const [copying, setCopying] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    router.push(`/budgets?month=${prevM}&year=${prevY}`)
  }

  const handleNextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    router.push(`/budgets?month=${nextM}&year=${nextY}`)
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

  const handleCreateNewCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setCreatingCategory(true)
    try {
      const initialBudget = parseFloat(newCatInitialBudget.replace(",", ".")) || 0
      await createCategoryAction({
        name: newCatName.trim(),
        type: "EXPENSE",
        color: newCatColor,
        initialBudget,
        month,
        year,
      })

      setIsNewCategoryOpen(false)
      setNewCatName("")
      setNewCatInitialBudget("")
      router.refresh()
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleCopyPreviousMonth = async () => {
    setCopying(true)
    setFeedbackMsg(null)
    try {
      const res = await copyBudgetPlansFromPreviousMonthAction(month, year)
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `Sucesso! ${res.count} tetos de orçamento foram clonados do mês anterior.`,
        })
        router.refresh()
      } else {
        setFeedbackMsg({
          type: "error",
          text: res.message || "Erro ao copiar orçamentos.",
        })
      }
    } catch {
      setFeedbackMsg({ type: "error", text: "Erro ao copiar orçamentos do mês anterior." })
    } finally {
      setCopying(false)
      setTimeout(() => setFeedbackMsg(null), 5000)
    }
  }

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Deseja realmente excluir a categoria "${catName}" e seus orçamentos?`)) return
    try {
      await deleteCategoryAction(catId)
      router.refresh()
    } catch (err) {
      alert("Não foi possível excluir esta categoria pois ela possui lançamentos associados.")
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
            {cycleLabel ? (
              <span>Ciclo financeiro: <strong className="text-zinc-200">{cycleLabel}</strong> ({totalDaysInMonth} dias) • Dia atual: <strong className="text-zinc-200">Dia {currentDay}</strong></span>
            ) : (
              <span>Personalize metas por categoria e acompanhe o consumo ao longo dos {totalDaysInMonth} dias do mês</span>
            )}
          </p>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CycleSettingsDialog currentCycleStartDay={cycleStartDay} cycleLabel={cycleLabel} />

          <div className="flex items-center bg-[#121215] border border-zinc-800 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="h-7 w-7 text-zinc-400 hover:text-white"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-mono font-semibold text-zinc-200">
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7 text-zinc-400 hover:text-white"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={copying}
            onClick={handleCopyPreviousMonth}
            className="h-8 text-xs border-zinc-800 bg-[#121215] text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>{copying ? "Copiando..." : "Copiar Mês Anterior"}</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewCategoryOpen(true)}
            className="h-8 text-xs bg-white text-black hover:bg-zinc-200 font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Teto / Categoria</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedbackMsg.type === "success"
              ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]"
              : "bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Global Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-400 uppercase">Teto Total Planejado</span>
          <div className="text-2xl font-bold font-mono text-zinc-100 mt-1">
            {formatBRL(totalPlanned)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            {categories.filter((c) => (planMap[c.id] || 0) > 0).length} categorias com meta
          </span>
        </Card>

        <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
          <span className="text-[11px] font-mono text-zinc-400 uppercase">Gasto Real até o Dia {currentDay}</span>
          <div className="text-2xl font-bold font-mono text-[#ef4444] mt-1">
            {formatBRL(totalSpent)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1 block">
            Ritmo do mês: {Math.round((currentDay / totalDaysInMonth) * 100)}% transcorrido
          </span>
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
          <span className="text-[10px] text-zinc-500 mt-1 block">
            {totalPlanned > 0
              ? `${Math.round(((totalPlanned - totalSpent) / totalPlanned) * 100)}% de folga orçamentária`
              : "Defina tetos para ver a margem"}
          </span>
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
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        cat.color === "red"
                          ? "bg-red-500"
                          : cat.color === "yellow"
                          ? "bg-yellow-500"
                          : cat.color === "green"
                          ? "bg-emerald-500"
                          : cat.color === "purple"
                          ? "bg-purple-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="text-xs font-semibold text-zinc-100">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500 mt-0.5 block">
                    {target > 0 ? `Meta: ${formatBRL(target)}` : "Sem teto definido"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenEdit(cat, target)}
                    className="h-7 text-xs px-2 text-zinc-400 hover:text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    <span>{target > 0 ? "Ajustar" : "Definir"}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="h-7 w-7 p-0 text-zinc-600 hover:text-[#ef4444]"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
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
                    <span className="text-zinc-500 block">Projeção Mês:</span>
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
                      <span>Orçamento estourado em {formatBRL(spent - target)}</span>
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
                  ) : (
                    <button
                      onClick={() => handleOpenEdit(cat, 0)}
                      className="w-full text-center text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800/50 py-1 rounded border border-dashed border-zinc-800 transition-colors"
                    >
                      + Clique para definir um teto mensal
                    </button>
                  )}
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
              Defina o limite máximo mensal para {MONTH_NAMES[month - 1]} de {year}.
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

            {/* Quick Presets */}
            <div className="flex items-center gap-2 pt-1">
              {[250, 500, 1000, 2000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTargetAmount(String(val))}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-[11px] font-mono text-zinc-300"
                >
                  R$ {val}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetAmount("0")}
                className="text-zinc-500 hover:text-red-400 text-xs h-8 px-2"
              >
                Remover Teto (Zerar)
              </Button>

              <div className="flex items-center gap-2">
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
                  {saving ? "Salvando..." : "Salvar Meta"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create New Custom Category & Budget Dialog */}
      <Dialog open={isNewCategoryOpen} onOpenChange={setIsNewCategoryOpen}>
        <DialogContent className="bg-[#121215] border border-zinc-800 text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Nova Categoria & Orçamento Personalizado</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Crie uma nova categoria de despesas e atribua um teto mensal inicial.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewCategory} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-zinc-300">Nome da Categoria</label>
              <Input
                type="text"
                required
                placeholder="Ex: Pets, Educação, Viagens, Investimentos"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-800 text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300">Teto Mensal Inicial (R$) - Opcional</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">
                  R$
                </span>
                <Input
                  type="text"
                  placeholder="Ex: 800,00"
                  value={newCatInitialBudget}
                  onChange={(e) => setNewCatInitialBudget(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">Cor de Destaque</label>
              <div className="flex items-center gap-3">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setNewCatColor(c.value)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${c.bg} ${
                      newCatColor === c.value
                        ? "ring-2 ring-white scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {newCatColor === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewCategoryOpen(false)}
                className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingCategory || !newCatName.trim()}
                className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold px-4"
              >
                {creatingCategory ? "Criando..." : "Criar Categoria"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
