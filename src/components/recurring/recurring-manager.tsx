"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Calendar,
  Check,
  Clock,
  Edit3,
  Search,
  Trash2,
  Ban,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Flame,
  Wallet,
  CreditCard,
  Repeat,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  CalendarDays,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog"
import {
  toggleTransactionStatusAction,
  cancelRecurringTransactionAction,
  deleteTransactionAction,
} from "@/actions/finance-actions"
import { getPaymentMethodConfig } from "@/lib/payment-methods"

interface RecurringManagerProps {
  initialData: any
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function RecurringManager({ initialData }: RecurringManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPendingTransition, startTransition] = useTransition()

  // Dialogs
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)

  // Search filter (client-side instantaneous)
  const [search, setSearch] = useState("")

  // Optimistic transaction status updates
  const [localItems, setLocalItems] = useState<any[]>(initialData.items || [])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showOverduePast, setShowOverduePast] = useState(false)

  // Sync when initialData changes
  useMemo(() => {
    setLocalItems(initialData.items || [])
  }, [initialData.items])

  const { kpis, cycle, pagination, filters, overdueBeforeCycle } = initialData

  // Helper to change URL query params preserving other params
  const updateQuery = (newParams: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() || "")
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === "") {
        params.delete(key)
      } else {
        params.set(key, String(val))
      }
    })
    startTransition(() => {
      router.push(`/recurring?${params.toString()}`)
    })
  }

  // Cycle navigation
  const handlePrevMonth = () => {
    let nextMonth = cycle.month - 1
    let nextYear = cycle.year
    if (nextMonth < 1) {
      nextMonth = 12
      nextYear -= 1
    }
    updateQuery({ month: nextMonth, year: nextYear, page: 1 })
  }

  const handleNextMonth = () => {
    let nextMonth = cycle.month + 1
    let nextYear = cycle.year
    if (nextMonth > 12) {
      nextMonth = 1
      nextYear += 1
    }
    updateQuery({ month: nextMonth, year: nextYear, page: 1 })
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    updateQuery({ month: now.getMonth() + 1, year: now.getFullYear(), page: 1 })
  }

  // Toggle transaction status (instant optimistic feedback)
  const handleToggleStatus = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await toggleTransactionStatusAction(id)
      if (res.success && res.transaction) {
        setLocalItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: res.transaction.status, paidAt: res.transaction.paidAt } : item))
        )
        // Refresh server data in background to keep KPIs updated
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  // Cancel recurring
  const handleCancelRecurring = async (id: string) => {
    if (confirm("Deseja cancelar esta conta recorrente e todas as suas projeções futuras?")) {
      setLoadingId(id)
      try {
        const res = await cancelRecurringTransactionAction(id)
        if (res.success) {
          setLocalItems((prev) => prev.filter((item) => item.id !== id))
          router.refresh()
        }
      } finally {
        setLoadingId(null)
      }
    }
  }

  // Delete transaction
  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      setLoadingId(id)
      try {
        const res = await deleteTransactionAction(id)
        if (res.success) {
          setLocalItems((prev) => prev.filter((item) => item.id !== id))
          router.refresh()
        }
      } finally {
        setLoadingId(null)
      }
    }
  }

  // Filter items by client-side search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return localItems
    const term = search.toLowerCase()
    return localItems.filter(
      (item) =>
        item.description.toLowerCase().includes(term) ||
        item.category?.name.toLowerCase().includes(term)
    )
  }, [localItems, search])

  // Chronological grouping
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const in7Days = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000)

  const categorizedGroups = useMemo(() => {
    const overdue: any[] = []
    const dueToday: any[] = []
    const dueSoon: any[] = []
    const futureDue: any[] = []
    const completed: any[] = []

    for (const item of filteredItems) {
      if (item.status === "COMPLETED") {
        completed.push(item)
        continue
      }

      const dueTime = new Date(item.dueDate).getTime()
      if (dueTime < todayStart.getTime()) {
        overdue.push(item)
      } else if (dueTime <= todayEnd.getTime()) {
        dueToday.push(item)
      } else if (dueTime <= in7Days.getTime()) {
        dueSoon.push(item)
      } else {
        futureDue.push(item)
      }
    }

    return { overdue, dueToday, dueSoon, futureDue, completed }
  }, [filteredItems, todayStart, todayEnd, in7Days])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val)
  }

  const formatDueDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = String(d.getUTCDate()).padStart(2, "0")
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    return `${day}/${month}`
  }

  const getDueUrgencyText = (dateStr: string, status: string) => {
    if (status === "COMPLETED") return "Pago"
    const due = new Date(dateStr)
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    const diffMs = dueDay.getTime() - todayStart.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const absDays = Math.abs(diffDays)
      return `Venceu há ${absDays} ${absDays === 1 ? "dia" : "dias"}`
    }
    if (diffDays === 0) {
      return "Vence hoje!"
    }
    if (diffDays === 1) {
      return "Vence amanhã"
    }
    return `Vence em ${diffDays} dias`
  }

  const isCurrentCycleMonth =
    cycle.year === now.getFullYear() && cycle.month === now.getMonth() + 1

  return (
    <div className="space-y-6">
      {/* 1. Header & Cycle Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white">
              <Repeat className="w-5 h-5 text-zinc-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Contas Fixas & Recorrentes</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono font-normal">
                  Cronológico
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Acompanhe vencimentos periódicos da data mais antiga à mais nova para evitar atrasos.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Quick Add Recurring */}
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setQuickAddOpen(true)}
            size="sm"
            className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-9 px-3.5 gap-1.5 rounded-md border-0 shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Conta Recorrente</span>
          </Button>
        </div>
      </div>

      {/* 2. Cycle Controls & Navigation */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handlePrevMonth}
              title="Ciclo Anterior"
              className="text-zinc-400 hover:text-white h-7 w-7"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 text-xs font-semibold text-zinc-200">
              {MONTH_NAMES[cycle.month - 1]} / {cycle.year}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleNextMonth}
              title="Próximo Ciclo"
              className="text-zinc-400 hover:text-white h-7 w-7"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {!isCurrentCycleMonth && (
            <Button
              variant="outline"
              size="xs"
              onClick={handleCurrentMonth}
              className="border-zinc-800 text-zinc-400 hover:text-white text-xs h-7"
            >
              Ir para Ciclo Atual
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
          <CalendarDays className="w-3.5 h-3.5 text-zinc-500" />
          <span>Intervalo do Ciclo: <strong className="text-zinc-200 font-semibold">{cycle.cycleLabel}</strong> ({cycle.totalDaysInCycle} dias)</span>
        </div>
      </div>

      {/* 3. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Em Atraso */}
        <div className={`p-4 rounded-xl border transition-all ${
          kpis.overdueCount > 0
            ? "bg-rose-950/20 border-rose-900/50 text-rose-200"
            : "bg-[#121215] border-zinc-800/80 text-zinc-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Em Atraso</span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              kpis.overdueCount > 0 ? "bg-rose-900/60 text-rose-400" : "bg-zinc-800 text-zinc-500"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${kpis.overdueCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {formatCurrency(kpis.overdueAmount)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.overdueCount === 1 ? "1 conta vencida" : `${kpis.overdueCount} contas vencidas`}
          </p>
        </div>

        {/* Card 2: Vencem Hoje */}
        <div className={`p-4 rounded-xl border transition-all ${
          kpis.dueTodayCount > 0
            ? "bg-amber-950/20 border-amber-900/50 text-amber-200"
            : "bg-[#121215] border-zinc-800/80 text-zinc-300"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Vencem Hoje</span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              kpis.dueTodayCount > 0 ? "bg-amber-900/60 text-amber-400" : "bg-zinc-800 text-zinc-500"
            }`}>
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono ${kpis.dueTodayCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {formatCurrency(kpis.dueTodayAmount)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.dueTodayCount === 1 ? "1 conta para hoje" : `${kpis.dueTodayCount} contas para hoje`}
          </p>
        </div>

        {/* Card 3: Próximos 7 Dias */}
        <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800/80 text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Próx. 7 Dias</span>
            <div className="w-6 h-6 rounded-md bg-zinc-800 text-sky-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-zinc-100">
              {formatCurrency(kpis.dueIn7DaysAmount)}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {kpis.dueIn7DaysCount === 1 ? "1 conta na semana" : `${kpis.dueIn7DaysCount} contas na semana`}
          </p>
        </div>

        {/* Card 4: Total a Pagar no Ciclo */}
        <div className="p-4 rounded-xl bg-[#121215] border border-zinc-800/80 text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              {filters.paymentFilter === "NO_CARD"
                ? "A Pagar (Fora do Cartão)"
                : filters.paymentFilter === "CARD_ONLY"
                ? "A Pagar (No Cartão)"
                : "A Pagar (Total Ciclo)"}
            </span>
            <div className="w-6 h-6 rounded-md bg-zinc-800 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-white">
              {formatCurrency(kpis.totalPendingAmount)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, kpis.paidPercentage)}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              {kpis.paidPercentage}% quitado
            </span>
          </div>
        </div>
      </div>

      {/* 4. Alert Banner: Past Overdue Accounts (if any) */}
      {kpis.overdueBeforeCycleCount > 0 && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs">
              <strong className="font-semibold text-amber-300">Atenção para pendências passadas:</strong>{" "}
              Você possui <strong>{kpis.overdueBeforeCycleCount} {kpis.overdueBeforeCycleCount === 1 ? "conta pendente" : "contas pendentes"}</strong> de ciclos anteriores totalizando{" "}
              <strong>{formatCurrency(kpis.overdueBeforeCycleAmount)}</strong> que ainda não foram marcadas como pagas.
            </div>
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowOverduePast((prev) => !prev)}
            className="border-amber-800/60 bg-amber-950/40 text-amber-300 hover:text-white text-xs h-7 shrink-0"
          >
            {showOverduePast ? "Ocultar Pendências" : "Visualizar Pendências"}
          </Button>
        </div>
      )}

      {/* Past Overdue Items List (Expanded) */}
      {showOverduePast && overdueBeforeCycle && overdueBeforeCycle.length > 0 && (
        <div className="bg-rose-950/10 border border-rose-900/30 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Contas Pendentes de Ciclos Anteriores</span>
          </h3>
          <div className="divide-y divide-zinc-800/60">
            {overdueBeforeCycle.map((item: any) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleStatus(item.id)}
                    className="w-5 h-5 rounded-full border border-rose-500/50 hover:bg-rose-500/20 flex items-center justify-center text-transparent hover:text-rose-300 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">{item.description}</p>
                    <p className="text-[11px] text-rose-400 font-mono">
                      Venceu em {formatDueDate(item.dueDate)} • {item.category?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-mono text-rose-400">
                    {formatCurrency(item.amount)}
                  </span>
                  <Button
                    size="xs"
                    onClick={() => handleToggleStatus(item.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-6 px-2.5 rounded-md"
                  >
                    Marcar Pago
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Filters Toolbar */}
      <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Payment Method Selector (Default: NO_CARD) */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => updateQuery({ payment: "NO_CARD", page: 1 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.paymentFilter === "NO_CARD"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>⚡ Fora do Cartão</span>
            </button>
            <button
              onClick={() => updateQuery({ payment: "ALL", page: 1 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.paymentFilter === "ALL"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>📋 Todas</span>
            </button>
            <button
              onClick={() => updateQuery({ payment: "CARD_ONLY", page: 1 })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.paymentFilter === "CARD_ONLY"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Só Cartão</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 p-1 rounded-lg">
            <button
              onClick={() => updateQuery({ status: "PENDING", page: 1 })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.statusFilter === "PENDING"
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              A Pagar ({kpis.pendingCount})
            </button>
            <button
              onClick={() => updateQuery({ status: "COMPLETED", page: 1 })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.statusFilter === "COMPLETED"
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Pagas ({kpis.paidCount})
            </button>
            <button
              onClick={() => updateQuery({ status: "ALL", page: 1 })}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filters.statusFilter === "ALL"
                  ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Todas ({kpis.pendingCount + kpis.paidCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 md:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Buscar conta ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border-zinc-800 pl-8 text-xs h-9 rounded-lg text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        </div>
      </div>

      {/* 6. Chronological List */}
      <div className="space-y-6">
        {filteredItems.length === 0 ? (
          <div className="bg-[#121215] border border-zinc-800/80 rounded-xl p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Nenhuma conta recorrente encontrada
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {filters.statusFilter === "PENDING"
                ? "Tudo em dia! Nenhuma conta recorrente pendente para o filtro e ciclo selecionados."
                : "Nenhum lançamento recorrente corresponde aos filtros atuais."}
            </p>
          </div>
        ) : (
          <>
            {/* Seção 1: Em Atraso */}
            {categorizedGroups.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Em Atraso ({categorizedGroups.overdue.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {categorizedGroups.overdue.map((item) => (
                    <RecurringItemCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      formatDueDate={formatDueDate}
                      getDueUrgencyText={getDueUrgencyText}
                      onToggle={handleToggleStatus}
                      onEdit={setEditingTransaction}
                      onCancelRecurring={handleCancelRecurring}
                      onDelete={handleDelete}
                      loadingId={loadingId}
                      urgencyVariant="OVERDUE"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seção 2: Vencem Hoje */}
            {categorizedGroups.dueToday.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Vencem Hoje ({categorizedGroups.dueToday.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {categorizedGroups.dueToday.map((item) => (
                    <RecurringItemCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      formatDueDate={formatDueDate}
                      getDueUrgencyText={getDueUrgencyText}
                      onToggle={handleToggleStatus}
                      onEdit={setEditingTransaction}
                      onCancelRecurring={handleCancelRecurring}
                      onDelete={handleDelete}
                      loadingId={loadingId}
                      urgencyVariant="TODAY"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seção 3: Próximos 7 Dias */}
            {categorizedGroups.dueSoon.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Próximos 7 Dias ({categorizedGroups.dueSoon.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {categorizedGroups.dueSoon.map((item) => (
                    <RecurringItemCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      formatDueDate={formatDueDate}
                      getDueUrgencyText={getDueUrgencyText}
                      onToggle={handleToggleStatus}
                      onEdit={setEditingTransaction}
                      onCancelRecurring={handleCancelRecurring}
                      onDelete={handleDelete}
                      loadingId={loadingId}
                      urgencyVariant="SOON"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seção 4: Mais Adiante no Ciclo */}
            {categorizedGroups.futureDue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Mais Adiante no Ciclo ({categorizedGroups.futureDue.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {categorizedGroups.futureDue.map((item) => (
                    <RecurringItemCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      formatDueDate={formatDueDate}
                      getDueUrgencyText={getDueUrgencyText}
                      onToggle={handleToggleStatus}
                      onEdit={setEditingTransaction}
                      onCancelRecurring={handleCancelRecurring}
                      onDelete={handleDelete}
                      loadingId={loadingId}
                      urgencyVariant="FUTURE"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Seção 5: Já Pagas */}
            {categorizedGroups.completed.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Já Pagas no Ciclo ({categorizedGroups.completed.length})
                  </h2>
                </div>
                <div className="space-y-2">
                  {categorizedGroups.completed.map((item) => (
                    <RecurringItemCard
                      key={item.id}
                      item={item}
                      formatCurrency={formatCurrency}
                      formatDueDate={formatDueDate}
                      getDueUrgencyText={getDueUrgencyText}
                      onToggle={handleToggleStatus}
                      onEdit={setEditingTransaction}
                      onCancelRecurring={handleCancelRecurring}
                      onDelete={handleDelete}
                      loadingId={loadingId}
                      urgencyVariant="COMPLETED"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 7. Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
          <span>
            Página <strong className="text-zinc-200">{pagination.page}</strong> de{" "}
            <strong className="text-zinc-200">{pagination.totalPages}</strong> ({pagination.totalCount} contas encontradas)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.page <= 1 || isPendingTransition}
              onClick={() => updateQuery({ page: pagination.page - 1 })}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white h-7 px-3"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={pagination.page >= pagination.totalPages || isPendingTransition}
              onClick={() => updateQuery({ page: pagination.page + 1 })}
              className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white h-7 px-3"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Global Quick Add Dialog for Recurring */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultRecurring={true}
        defaultStatus="PENDING"
        onSuccess={() => router.refresh()}
      />

      {/* Edit Transaction Dialog */}
      <EditTransactionDialog
        open={Boolean(editingTransaction)}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => {
          setEditingTransaction(null)
          router.refresh()
        }}
      />
    </div>
  )
}

interface RecurringItemCardProps {
  item: any
  formatCurrency: (val: number) => string
  formatDueDate: (d: string) => string
  getDueUrgencyText: (d: string, status: string) => string
  onToggle: (id: string) => void
  onEdit: (item: any) => void
  onCancelRecurring: (id: string) => void
  onDelete: (id: string) => void
  loadingId: string | null
  urgencyVariant: "OVERDUE" | "TODAY" | "SOON" | "FUTURE" | "COMPLETED"
}

function RecurringItemCard({
  item,
  formatCurrency,
  formatDueDate,
  getDueUrgencyText,
  onToggle,
  onEdit,
  onCancelRecurring,
  onDelete,
  loadingId,
  urgencyVariant,
}: RecurringItemCardProps) {
  const isCompleted = item.status === "COMPLETED"
  const isIncome = item.type === "INCOME"
  const methodConfig = getPaymentMethodConfig(item.paymentMethod)
  const isActionLoading = loadingId === item.id

  const cardBorderClass =
    urgencyVariant === "OVERDUE"
      ? "border-rose-900/40 bg-rose-950/10 hover:border-rose-800/60"
      : urgencyVariant === "TODAY"
      ? "border-amber-900/40 bg-amber-950/10 hover:border-amber-800/60"
      : urgencyVariant === "SOON"
      ? "border-sky-900/30 bg-sky-950/10 hover:border-sky-800/50"
      : isCompleted
      ? "border-zinc-800/60 bg-[#121215]/50 opacity-75 hover:opacity-100"
      : "border-zinc-800/80 bg-[#121215] hover:border-zinc-700"

  const urgencyBadge = () => {
    const text = getDueUrgencyText(item.dueDate, item.status)
    if (urgencyVariant === "OVERDUE") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-800/60">
          🚨 {text}
        </span>
      )
    }
    if (urgencyVariant === "TODAY") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/60">
          ⚡ {text}
        </span>
      )
    }
    if (urgencyVariant === "SOON") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-950/50 text-sky-400 border border-sky-800/40">
          ⏳ {text}
        </span>
      )
    }
    if (isCompleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
          ✓ Quitado
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-400">
        {text}
      </span>
    )
  }

  return (
    <div
      className={`rounded-xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-all ${cardBorderClass}`}
    >
      {/* Left: 1-Click Checkbox + Title + Category + Badges */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => onToggle(item.id)}
          disabled={isActionLoading}
          title={isCompleted ? "Marcar como pendente" : "Marcar como pago"}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${
            isCompleted
              ? "bg-emerald-500 text-black border border-emerald-400"
              : urgencyVariant === "OVERDUE"
              ? "border-2 border-rose-500 hover:bg-rose-500/20 text-transparent hover:text-rose-400"
              : urgencyVariant === "TODAY"
              ? "border-2 border-amber-400 hover:bg-amber-400/20 text-transparent hover:text-amber-400"
              : "border-2 border-zinc-600 hover:border-white text-transparent hover:text-white"
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs sm:text-sm font-semibold truncate ${
                isCompleted ? "line-through text-zinc-400" : "text-zinc-100"
              }`}
            >
              {item.description}
            </span>
            {urgencyBadge()}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1 font-mono text-zinc-300">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {formatDueDate(item.dueDate)}
            </span>

            <span>•</span>

            <span className="text-zinc-400 truncate">
              {item.category?.name || "Sem Categoria"}
            </span>

            <span>•</span>

            {/* Payment method badge */}
            <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
              {methodConfig?.label || item.paymentMethod || "PIX"}
            </span>

            {item.recurrenceRule && (
              <span className="text-zinc-500 hidden sm:inline">
                ({item.recurrenceRule === "MONTHLY" ? "Mensal" : item.recurrenceRule})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Value + Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span
          className={`text-sm sm:text-base font-bold font-mono text-right ${
            isIncome
              ? "text-emerald-400"
              : isCompleted
              ? "text-zinc-400"
              : urgencyVariant === "OVERDUE"
              ? "text-rose-400"
              : urgencyVariant === "TODAY"
              ? "text-amber-400"
              : "text-zinc-100"
          }`}
        >
          {formatCurrency(item.amount)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onEdit(item)}
            title="Editar Conta"
            className="text-zinc-500 hover:text-white h-7 w-7"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onCancelRecurring(item.id)}
            title="Cancelar Recorrência Futura"
            className="text-zinc-500 hover:text-amber-400 h-7 w-7"
          >
            <Ban className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(item.id)}
            title="Excluir Lançamento"
            className="text-zinc-500 hover:text-rose-400 h-7 w-7"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
