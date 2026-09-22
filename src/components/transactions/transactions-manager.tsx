"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, Clock, Edit3, Filter, Plus, Repeat, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog"
import { deleteTransactionAction, toggleTransactionStatusAction } from "@/actions/finance-actions"
import { useRouter } from "next/navigation"

interface TransactionsManagerProps {
  initialTransactions: any[]
}

export function TransactionsManager({ initialTransactions }: TransactionsManagerProps) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL")
  const [recurrenceFilter, setRecurrenceFilter] = useState<"ALL" | "RECURRING" | "ONEOFF">("ALL")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      setLoadingId(id)
      await deleteTransactionAction(id)
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      setLoadingId(null)
      router.refresh()
    }
  }

  const handleToggle = async (id: string) => {
    setLoadingId(id)
    const res = await toggleTransactionStatusAction(id)
    if (res.success && res.transaction) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: res.transaction.status } : t))
      )
    }
    setLoadingId(null)
    router.refresh()
  }

  const filtered = transactions.filter((t) => {
    // Type filter
    if (typeFilter !== "ALL" && t.type !== typeFilter) return false
    // Recurrence filter
    if (recurrenceFilter === "RECURRING" && !t.isRecurring) return false
    if (recurrenceFilter === "ONEOFF" && t.isRecurring) return false
    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchDesc = t.description.toLowerCase().includes(q)
      const matchCat = t.category?.name.toLowerCase().includes(q)
      if (!matchDesc && !matchCat) return false
    }
    return true
  })

  // Totals for current filter
  const totalIncome = filtered
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + t.amount, 0)
  const totalExpense = filtered
    .filter((t) => t.type === "EXPENSE")
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Transações & Fluxo Financeiro</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Controle analítico de entradas e despesas recorrentes e avulsas
          </p>
        </div>

        <Button
          onClick={() => setQuickAddOpen(true)}
          className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-9 px-4 gap-2 rounded-md"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Novo Lançamento</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#121215] border border-zinc-800 p-3 rounded-xl">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar por descrição ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-zinc-900 border-zinc-800 text-white focus-visible:ring-1 focus-visible:ring-zinc-400"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                typeFilter === "ALL"
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter("INCOME")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                typeFilter === "INCOME"
                  ? "bg-[#10b981]/20 text-[#10b981] font-semibold border border-[#10b981]/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowUpRight className="w-3 h-3" />
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter("EXPENSE")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                typeFilter === "EXPENSE"
                  ? "bg-[#ef4444]/20 text-[#ef4444] font-semibold border border-[#ef4444]/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ArrowDownLeft className="w-3 h-3" />
              Despesas
            </button>
          </div>

          {/* Recurrence Mode */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setRecurrenceFilter("ALL")}
              className={`px-2.5 py-1.5 rounded-md font-medium ${
                recurrenceFilter === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-400"
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => setRecurrenceFilter("RECURRING")}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1 ${
                recurrenceFilter === "RECURRING"
                  ? "bg-[#3b82f6]/20 text-[#3b82f6] font-semibold border border-[#3b82f6]/30"
                  : "text-zinc-400"
              }`}
            >
              <Repeat className="w-3 h-3" />
              Recorrentes
            </button>
            <button
              onClick={() => setRecurrenceFilter("ONEOFF")}
              className={`px-2.5 py-1.5 rounded-md font-medium ${
                recurrenceFilter === "ONEOFF" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"
              }`}
            >
              Avulsas
            </button>
          </div>
        </div>
      </div>

      {/* Summary Bar of current filter */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg text-xs font-mono">
        <span className="text-zinc-400">
          Exibindo <strong className="text-white">{filtered.length}</strong> transações
        </span>
        <div className="flex items-center space-x-4">
          <span className="text-[#10b981]">
            Entradas: <strong>+{formatBRL(totalIncome)}</strong>
          </span>
          <span className="text-[#ef4444]">
            Despesas: <strong>-{formatBRL(totalExpense)}</strong>
          </span>
          <span className="text-zinc-300 border-l border-zinc-800 pl-4">
            Balanço:{" "}
            <strong className={totalIncome - totalExpense >= 0 ? "text-zinc-100" : "text-[#ef4444]"}>
              {formatBRL(totalIncome - totalExpense)}
            </strong>
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden shadow-xs">
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    Nenhuma transação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isIncome = t.type === "INCOME"
                  const isPending = t.status === "PENDING"

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-zinc-900/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div
                            className={`w-6 h-6 rounded flex items-center justify-center ${
                              isIncome
                                ? "bg-[#10b981]/15 text-[#10b981]"
                                : "bg-[#ef4444]/15 text-[#ef4444]"
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-zinc-100 block">
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

                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {t.paymentMethod || "PIX"}
                      </td>

                      <td className="py-3 px-4">
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
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isIncome ? "text-[#10b981]" : "text-[#ef4444]"}>
                          {isIncome ? "+" : "-"}
                          {formatBRL(t.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            onClick={() => handleDelete(t.id)}
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
