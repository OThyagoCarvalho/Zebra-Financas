"use client"

import { useState, useMemo } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  Calendar,
  Check,
  Clock,
  Edit3,
  Filter,
  Layers,
  Plus,
  Repeat,
  Search,
  Trash2,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog"
import {
  deleteTransactionAction,
  toggleTransactionStatusAction,
  cancelRecurringTransactionAction,
} from "@/actions/finance-actions"
import { getPaymentMethodConfig } from "@/lib/payment-methods"
import { useRouter } from "next/navigation"

interface TransactionsManagerProps {
  initialTransactions: any[]
}

type SortOption = "DATE_DESC" | "DATE_ASC" | "AMOUNT_DESC" | "AMOUNT_ASC"

export function TransactionsManager({ initialTransactions }: TransactionsManagerProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [recurrenceFilter, setRecurrenceFilter] = useState<"ALL" | "RECURRING" | "ONEOFF">("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING" | "CANCELED">("ALL")

  // Sorting: DEFAULT IS DATE_DESC (most recent date to oldest date)
  const [sortBy, setSortBy] = useState<SortOption>("DATE_DESC")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const [loadingId, setLoadingId] = useState<string | null>(null)

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Filter and Sort
  const filteredAndSorted = useMemo(() => {
    // 1. Filter
    const filtered = transactions.filter((t) => {
      // Text search
      const matchesSearch =
        search === "" ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category?.name?.toLowerCase().includes(search.toLowerCase())

      // Type filter
      const matchesType = typeFilter === "ALL" || t.type === typeFilter

      // Recurrence filter
      const matchesRecurrence =
        recurrenceFilter === "ALL" ||
        (recurrenceFilter === "RECURRING" && t.isRecurring) ||
        (recurrenceFilter === "ONEOFF" && !t.isRecurring)

      // Status filter
      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter

      return matchesSearch && matchesType && matchesRecurrence && matchesStatus
    })

    // 2. Sort - default is newest date first to oldest
    return filtered.sort((a, b) => {
      if (sortBy === "DATE_DESC") {
        const diff = new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        if (diff !== 0) return diff
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      }
      if (sortBy === "DATE_ASC") {
        const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        if (diff !== 0) return diff
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      }
      if (sortBy === "AMOUNT_DESC") {
        return b.amount - a.amount
      }
      if (sortBy === "AMOUNT_ASC") {
        return a.amount - b.amount
      }
      return 0
    })
  }, [transactions, search, typeFilter, recurrenceFilter, statusFilter, sortBy])

  // Pagination calculations
  const totalItems = filteredAndSorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedTransactions = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return filteredAndSorted.slice(start, start + itemsPerPage)
  }, [filteredAndSorted, safePage, itemsPerPage])

  // Reset pagination when filters change
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }

  const handleTypeChange = (val: "ALL" | "INCOME" | "EXPENSE") => {
    setTypeFilter(val)
    setCurrentPage(1)
  }

  const handleRecurrenceChange = (val: "ALL" | "RECURRING" | "ONEOFF") => {
    setRecurrenceFilter(val)
    setCurrentPage(1)
  }

  const handleStatusChange = (val: "ALL" | "COMPLETED" | "PENDING" | "CANCELED") => {
    setStatusFilter(val)
    setCurrentPage(1)
  }

  const handleSortChange = (val: SortOption) => {
    setSortBy(val)
    setCurrentPage(1)
  }

  const handleToggle = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await toggleTransactionStatusAction(id)
      if (res.success && res.transaction) {
        setTransactions((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: res.transaction.status } : item))
        )
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string, desc?: string) => {
    const label = desc ? `"${desc}"` : "este lançamento"
    if (!confirm(`Deseja realmente excluir ${label}?`)) return

    setLoadingId(id)
    try {
      const res = await deleteTransactionAction(id)
      if (res.success) {
        setTransactions((prev) => prev.filter((item) => item.id !== id))
      }
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancelRecurring = async (t: any) => {
    if (!confirm(`Deseja realmente cancelar a recorrência de "${t.description}" e todos os lançamentos futuros vinculados a ela?`)) return

    setLoadingId(t.id)
    try {
      const res = await cancelRecurringTransactionAction(t.id)
      if (res.success) {
        setTransactions((prev) =>
          prev.map((item) =>
            item.id === t.id ||
            (t.installmentGroupId && item.installmentGroupId === t.installmentGroupId && item.status === "PENDING")
              ? { ...item, status: "CANCELED" }
              : item
          )
        )
      }
    } catch (err) {
      console.error("Failed to cancel recurring transaction", err)
    } finally {
      setLoadingId(null)
    }
  }

  // Totals for current filtered set (excluding canceled from standard expense/income if needed)
  const totalIncome = filteredAndSorted
    .filter((t) => t.type === "INCOME" && t.status !== "CANCELED")
    .reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = filteredAndSorted
    .filter((t) => t.type === "EXPENSE" && t.status !== "CANCELED")
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Histórico de Lançamentos</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Gerencie todas as despesas e receitas avulsas ou recorrentes cadastradas
          </p>
        </div>

        <Button
          onClick={() => setQuickAddOpen(true)}
          size="sm"
          className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8 px-3.5 gap-1.5 rounded-md self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
          <span>Novo Lançamento</span>
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <Input
              type="text"
              placeholder="Buscar por descrição ou categoria..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-[#121215] border-zinc-800 text-xs h-9 focus-visible:ring-1 focus-visible:ring-zinc-400 text-zinc-200"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => handleTypeChange("ALL")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  typeFilter === "ALL"
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Filter className="w-3 h-3 shrink-0" />
                <span>Todas</span>
              </button>
              <button
                onClick={() => handleTypeChange("INCOME")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  typeFilter === "INCOME"
                    ? "bg-[#10b981]/20 text-[#10b981] font-semibold border border-[#10b981]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-3 h-3 shrink-0" />
                <span>Entradas</span>
              </button>
              <button
                onClick={() => handleTypeChange("EXPENSE")}
                className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                  typeFilter === "EXPENSE"
                    ? "bg-[#ef4444]/20 text-[#ef4444] font-semibold border border-[#ef4444]/30"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowDownLeft className="w-3 h-3 shrink-0" />
                <span>Despesas</span>
              </button>
            </div>

            {/* Recurrence Mode */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => handleRecurrenceChange("ALL")}
                className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${
                  recurrenceFilter === "ALL" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"
                }`}
              >
                <Layers className="w-3 h-3 shrink-0" />
                <span>Tudo</span>
              </button>
              <button
                onClick={() => handleRecurrenceChange("RECURRING")}
                className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${
                  recurrenceFilter === "RECURRING"
                    ? "bg-[#3b82f6]/20 text-[#3b82f6] font-semibold border border-[#3b82f6]/30"
                    : "text-zinc-400"
                }`}
              >
                <Repeat className="w-3 h-3 shrink-0" />
                <span>Recorrentes</span>
              </button>
              <button
                onClick={() => handleRecurrenceChange("ONEOFF")}
                className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 ${
                  recurrenceFilter === "ONEOFF" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"
                }`}
              >
                <Calendar className="w-3 h-3 shrink-0" />
                <span>Avulsas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Toolbar: Status filter + Sorting Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Status:
            </span>
            {(
              [
                { id: "ALL", label: "Todos" },
                { id: "COMPLETED", label: "Efetivados" },
                { id: "PENDING", label: "Pendentes" },
                { id: "CANCELED", label: "Cancelados" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => handleStatusChange(s.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  statusFilter === s.id
                    ? "bg-zinc-800 text-white font-semibold border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Sort Selector: Default is DATE_DESC (Mais Recentes) */}
          <div className="flex items-center gap-1.5 text-xs self-end sm:self-auto">
            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Ordem:
            </span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              <option value="DATE_DESC">Mais Recentes primeiro (Padrão)</option>
              <option value="DATE_ASC">Mais Antigas primeiro</option>
              <option value="AMOUNT_DESC">Maior Valor</option>
              <option value="AMOUNT_ASC">Menor Valor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Bar of current filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg text-xs font-mono">
        <span className="text-zinc-400">
          Total encontrado: <strong className="text-white">{filteredAndSorted.length}</strong> lançamentos
        </span>
        <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
          <span className="text-[#10b981]">
            Entradas: <strong>+{formatBRL(totalIncome)}</strong>
          </span>
          <span className="text-[#ef4444]">
            Despesas: <strong>-{formatBRL(totalExpense)}</strong>
          </span>
          <span className="text-zinc-300 border-l border-zinc-800 pl-3 sm:pl-4">
            Balanço:{" "}
            <strong className={totalIncome - totalExpense >= 0 ? "text-zinc-100" : "text-[#ef4444]"}>
              {formatBRL(totalIncome - totalExpense)}
            </strong>
          </span>
        </div>
      </div>

      {/* Mobile Transactions Card List (Always visible edit & delete icons) */}
      <div className="block md:hidden space-y-3">
        {paginatedTransactions.length === 0 ? (
          <div className="bg-[#121215] border border-zinc-800 rounded-xl p-8 text-center text-zinc-500 font-mono text-xs">
            Nenhuma transação encontrada com os filtros selecionados.
          </div>
        ) : (
          paginatedTransactions.map((t) => {
            const isIncome = t.type === "INCOME"
            const isPending = t.status === "PENDING"
            const isCanceled = t.status === "CANCELED"
            const config = getPaymentMethodConfig(t.paymentMethod)

            return (
              <div
                key={t.id}
                className={`bg-[#121215] border rounded-xl p-3.5 space-y-3 shadow-xs ${
                  isCanceled ? "border-zinc-800/40 opacity-70" : "border-zinc-800/80"
                }`}
              >
                {/* Top Row: Icon, Description & Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                        isCanceled
                          ? "bg-zinc-800 text-zinc-500"
                          : isIncome
                          ? "bg-[#10b981]/15 text-[#10b981]"
                          : "bg-[#ef4444]/15 text-[#ef4444]"
                      }`}
                    >
                      {isCanceled ? (
                        <Ban className="w-3.5 h-3.5" />
                      ) : isIncome ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={`font-semibold text-xs block truncate ${isCanceled ? "line-through text-zinc-400" : "text-zinc-100"}`}>
                        {t.description}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/60 text-[10px] text-zinc-300">
                          {t.category?.name || "Sem categoria"}
                        </span>
                        {config.isCredit ? (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono border"
                            style={{
                              color: config.color,
                              backgroundColor: config.bg,
                              borderColor: config.border,
                            }}
                          >
                            {config.label}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400">
                            {config.label}
                          </span>
                        )}
                        {t.isRecurring && (
                          <span className="text-[10px] text-blue-400 font-mono flex items-center gap-0.5">
                            <Repeat className="w-2.5 h-2.5" />
                            Mensal
                          </span>
                        )}
                        {t.source === "WHATSAPP" && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold ${
                        isCanceled
                          ? "text-zinc-500 line-through"
                          : isIncome
                          ? "text-[#10b981]"
                          : "text-[#ef4444]"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatBRL(t.amount)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Status Toggle & ALWAYS VISIBLE Edit / Delete / Cancel Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 gap-2 flex-wrap">
                  {isCanceled ? (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold border bg-zinc-900 border-zinc-800 text-zinc-400 flex items-center gap-1 font-mono">
                      <Ban className="w-2.5 h-2.5 text-zinc-500" />
                      Cancelada
                    </span>
                  ) : (
                    <button
                      onClick={() => handleToggle(t.id)}
                      disabled={loadingId === t.id}
                      className={`px-2 py-1 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                        isPending
                          ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 hover:bg-[#f59e0b]/25"
                          : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white"
                      }`}
                    >
                      {isPending ? (
                        <>
                          <Clock className="w-2.5 h-2.5" />
                          Pendente
                        </>
                      ) : (
                        <>
                          <Check className="w-2.5 h-2.5 text-[#10b981]" />
                          Efetivado
                        </>
                      )}
                    </button>
                  )}

                  <div className="flex items-center space-x-1">
                    {t.isRecurring && !isCanceled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelRecurring(t)}
                        disabled={loadingId === t.id}
                        className="h-7 px-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 flex items-center gap-1 rounded-md"
                        title="Cancelar Recorrência"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Cancelar</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTransaction(t)}
                      className="h-7 px-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-1 rounded-md"
                      title="Editar Lançamento"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id, t.description)}
                      disabled={loadingId === t.id}
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 flex items-center gap-1 rounded-md"
                      title="Excluir Lançamento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Desktop Transactions Table (hidden on mobile) */}
      <div className="hidden md:block bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Recorrência</th>
                <th className="py-3 px-4">Data Venc.</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => {
                  const isIncome = t.type === "INCOME"
                  const isPending = t.status === "PENDING"
                  const isCanceled = t.status === "CANCELED"

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-zinc-900/40 transition-colors group ${
                        isCanceled ? "opacity-60 bg-zinc-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                              isCanceled
                                ? "bg-zinc-800 text-zinc-500"
                                : isIncome
                                ? "bg-[#10b981]/15 text-[#10b981]"
                                : "bg-[#ef4444]/15 text-[#ef4444]"
                            }`}
                          >
                            {isCanceled ? (
                              <Ban className="w-3.5 h-3.5" />
                            ) : isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className={`font-medium block ${isCanceled ? "line-through text-zinc-400" : "text-zinc-100"}`}>
                              {t.description}
                            </span>
                            {t.source === "WHATSAPP" && (
                              <span className="text-[10px] text-emerald-400 font-mono">
                                via WhatsApp
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-300">
                        <span className="px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px]">
                          {t.category?.name || "Sem categoria"}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px]">
                        {t.isRecurring ? (
                          <span className="text-blue-400 flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            Mensal
                          </span>
                        ) : (
                          <span className="text-zinc-500">Avulsa</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        {(() => {
                          const config = getPaymentMethodConfig(t.paymentMethod)
                          return config.isCredit ? (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border"
                              style={{
                                color: config.color,
                                backgroundColor: config.bg,
                                borderColor: config.border,
                              }}
                            >
                              {config.label}
                            </span>
                          ) : (
                            <span className="font-mono text-zinc-400">
                              {config.label}
                            </span>
                          )
                        })()}
                      </td>

                      <td className="py-3 px-4">
                        {isCanceled ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-zinc-900 border-zinc-800 text-zinc-400 flex items-center gap-1 font-mono w-max">
                            <Ban className="w-2.5 h-2.5 text-zinc-500" />
                            Cancelada
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggle(t.id)}
                            disabled={loadingId === t.id}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                              isPending
                                ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 hover:bg-[#f59e0b]/25"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white"
                            }`}
                          >
                            {isPending ? (
                              <>
                                <Clock className="w-2.5 h-2.5" />
                                Pendente
                              </>
                            ) : (
                              <>
                                <Check className="w-2.5 h-2.5 text-[#10b981]" />
                                Efetivado
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isCanceled ? "text-zinc-500 line-through" : isIncome ? "text-[#10b981]" : "text-[#ef4444]"}>
                          {isIncome ? "+" : "-"}
                          {formatBRL(t.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-100 transition-opacity">
                          {t.isRecurring && !isCanceled && (
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => handleCancelRecurring(t)}
                              disabled={loadingId === t.id}
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                              title="Cancelar Recorrência Futura"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => setEditingTransaction(t)}
                            className="text-zinc-400 hover:text-white"
                            title="Editar Lançamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => handleDelete(t.id, t.description)}
                            disabled={loadingId === t.id}
                            className="text-zinc-500 hover:text-[#ef4444]"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls Bar */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-[11px] sm:text-xs">
            <span>
              Mostrando <strong className="text-zinc-200">{(safePage - 1) * itemsPerPage + 1}</strong> a{" "}
              <strong className="text-zinc-200">{Math.min(safePage * itemsPerPage, totalItems)}</strong> de{" "}
              <strong className="text-zinc-200">{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-zinc-500">Exibir:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 font-mono">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="h-7 w-7 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
              title="Primeira página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-7 w-7 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <div className="flex items-center px-2 text-xs text-zinc-400">
              <span>
                Pág. <strong className="text-zinc-100">{safePage}</strong> de{" "}
                <strong className="text-zinc-100">{totalPages}</strong>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-7 w-7 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
              title="Próxima página"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              className="h-7 w-7 p-0 bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
              title="Última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={() => router.refresh()}
      />

      <EditTransactionDialog
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onSuccess={(updated) => {
          setTransactions((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t))
          )
          router.refresh()
        }}
      />
    </div>
  )
}
