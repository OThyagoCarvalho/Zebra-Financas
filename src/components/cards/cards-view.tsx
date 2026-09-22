"use client"

import { useState } from "react"
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog"
import { CycleSettingsDialog } from "@/components/layout/cycle-settings-dialog"
import {
  toggleTransactionStatusAction,
  deleteTransactionAction,
  deleteInstallmentGroupAction,
  markCardInvoiceAsPaidAction,
} from "@/actions/finance-actions"
import { getPaymentMethodConfig, CREDIT_CARDS } from "@/lib/payment-methods"
import { useRouter } from "next/navigation"

interface CardsViewProps {
  year: number
  month: number
  cycleLabel: string
  totalDaysInCycle: number
  cycleStartDay: number
  grandTotal: number
  grandPaid: number
  grandPending: number
  cards: Array<{
    cardId: string
    config: any
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    transactionsCount: number
    transactions: any[]
  }>
  projections: Array<{
    year: number
    month: number
    label: string
    cycleLabel: string
    totalProjected: number
    byCard: Record<string, number>
  }>
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

export function CardsView({
  year,
  month,
  cycleLabel,
  totalDaysInCycle,
  cycleStartDay,
  grandTotal,
  grandPaid,
  grandPending,
  cards,
  projections,
}: CardsViewProps) {
  const router = useRouter()
  const [selectedCardId, setSelectedCardId] = useState<string>("ALL")
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Month navigation
  const handlePrevMonth = () => {
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    router.push(`/cards?month=${prevM}&year=${prevY}`)
  }

  const handleNextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    router.push(`/cards?month=${nextM}&year=${nextY}`)
  }

  // Filter transactions
  const activeCard = cards.find((c) => c.cardId === selectedCardId)
  const filteredTransactions = selectedCardId === "ALL"
    ? cards.flatMap((c) => c.transactions).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
    : (activeCard?.transactions || []).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())

  const handleToggleStatus = async (tId: string) => {
    setLoadingActionId(tId)
    try {
      await toggleTransactionStatusAction(tId)
      router.refresh()
    } finally {
      setLoadingActionId(null)
    }
  }

  const handleDelete = async (t: any) => {
    if (t.installmentGroupId) {
      const choice = confirm(
        `Esta compra é parcelada (${t.description}).\n\n` +
        `Clique "OK" para excluir APENAS esta parcela.\n` +
        `Clique "Cancelar" para manter como está.`
      )
      if (!choice) return
    } else {
      if (!confirm(`Deseja excluir a compra "${t.description}"?`)) return
    }

    setLoadingActionId(t.id)
    try {
      await deleteTransactionAction(t.id)
      router.refresh()
    } finally {
      setLoadingActionId(null)
    }
  }

  const handleDeleteAllInstallments = async (groupId: string, desc: string) => {
    if (confirm(`Deseja realmente excluir TODAS as parcelas de "${desc}" de todos os meses?`)) {
      try {
        await deleteInstallmentGroupAction(groupId, false)
        router.refresh()
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleMarkInvoiceAsPaid = async () => {
    if (selectedCardId === "ALL") return
    const cardCfg = getPaymentMethodConfig(selectedCardId)
    if (!confirm(`Deseja marcar como PAGA toda a fatura pendente do ${cardCfg.label} neste ciclo?`)) return

    setMarkingPaid(true)
    try {
      await markCardInvoiceAsPaidAction(selectedCardId, year, month)
      router.refresh()
    } finally {
      setMarkingPaid(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-zinc-100" />
            <span>Faturas e Cartões de Crédito</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Ciclo de fatura: <strong className="text-zinc-200">{cycleLabel}</strong> ({totalDaysInCycle} dias) • Gestão de limites e parcelas futuras
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
            onClick={() => setQuickAddOpen(true)}
            className="h-8 text-xs bg-white text-black hover:bg-zinc-200 font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Compra</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Fatura Consolidada (Ciclo)</span>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatBRL(grandTotal)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Total de compras no crédito neste ciclo
          </p>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Faturas Pagas / Efetivadas</span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#10b981]">
            {formatBRL(grandPaid)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Lançamentos já quitados ou debitados
          </p>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
            <span>Faturas em Aberto / Pendente</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {formatBRL(grandPending)}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Aguardando fechamento ou vencimento
          </p>
        </div>
      </div>

      {/* 3. Interactive Credit Cards Deck */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
            <span>Seus Cartões de Crédito</span>
            <span className="text-[10px] font-mono font-normal text-zinc-500 lowercase">
              (clique para filtrar)
            </span>
          </h2>

          <button
            onClick={() => setSelectedCardId("ALL")}
            className={`text-xs px-2.5 py-1 rounded-md transition-all font-mono flex items-center gap-1.5 ${
              selectedCardId === "ALL"
                ? "bg-white text-black font-semibold"
                : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Ver Todos ({cards.reduce((acc, c) => acc + c.transactionsCount, 0)})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {cards.map((card) => {
            const isSelected = selectedCardId === card.cardId
            const cfg = card.config
            return (
              <div
                key={card.cardId}
                onClick={() => setSelectedCardId(isSelected ? "ALL" : card.cardId)}
                className={`relative cursor-pointer rounded-xl p-4 transition-all duration-200 border text-left overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-white/80 shadow-lg scale-[1.01]"
                    : "hover:border-zinc-700 bg-[#121215]"
                }`}
                style={{
                  backgroundColor: isSelected ? "#18181b" : "#121215",
                  borderColor: isSelected ? cfg.color || "#fff" : "rgb(39 39 42)",
                }}
              >
                {/* Accent top bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: cfg.color || "#fff" }}
                />

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span
                      className="text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border"
                      style={{
                        color: cfg.color,
                        borderColor: cfg.border,
                        backgroundColor: cfg.bg,
                      }}
                    >
                      {cfg.brandInitials || "CARD"}
                    </span>
                    <h3 className="text-xs font-semibold text-white mt-1">
                      {cfg.label}
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      {cfg.bankName || "Cartão"}
                    </p>
                  </div>

                  <CreditCard
                    className="w-5 h-5 transition-colors"
                    style={{ color: cfg.color || "#a1a1aa" }}
                  />
                </div>

                <div className="mt-2">
                  <div className="text-lg font-bold font-mono text-white">
                    {formatBRL(card.totalAmount)}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
                    <span>{card.transactionsCount} compras</span>
                    {card.pendingAmount > 0 ? (
                      <span className="text-amber-400 font-medium">
                        {formatBRL(card.pendingAmount)} aberta
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Paga
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Future Installments Projection (Next 6 Months) */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span>Projeção de Faturas Futuras (Parcelas no Tempo)</span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Valores já contratados que entrarão nos orçamentos dos próximos ciclos
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
            <span>Total comprometido futuro:</span>
            <strong className="text-orange-400 font-bold">
              {formatBRL(projections.reduce((acc, p) => acc + p.totalProjected, 0))}
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {projections.map((p) => {
            const hasAmount = p.totalProjected > 0
            return (
              <div
                key={p.label}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  hasAmount
                    ? "bg-zinc-900/90 border-zinc-700/80"
                    : "bg-zinc-950/40 border-zinc-900 text-zinc-600"
                }`}
              >
                <div className="text-[10px] font-mono text-zinc-400 mb-1">
                  {p.label}
                </div>
                <div
                  className={`text-sm font-bold font-mono ${
                    hasAmount ? "text-orange-400" : "text-zinc-600"
                  }`}
                >
                  {formatBRL(p.totalProjected)}
                </div>
                <div className="text-[9px] text-zinc-500 mt-1 truncate">
                  {p.cycleLabel}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 5. Transactions Breakdown for Selected Card */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span>Lançamentos na Fatura</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                {selectedCardId === "ALL"
                  ? "Todos os Cartões"
                  : getPaymentMethodConfig(selectedCardId).label}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {filteredTransactions.length} compra(s) registradas neste ciclo
            </p>
          </div>

          {selectedCardId !== "ALL" && activeCard && activeCard.pendingAmount > 0 && (
            <Button
              size="sm"
              disabled={markingPaid}
              onClick={handleMarkInvoiceAsPaid}
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{markingPaid ? "Processando..." : "Marcar Fatura como Paga"}</span>
            </Button>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-xs">
            Nenhuma compra registrada para este cartão no ciclo {cycleLabel}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Data Vencimento</th>
                  <th className="py-2.5 px-4">Descrição</th>
                  <th className="py-2.5 px-4">Cartão</th>
                  <th className="py-2.5 px-4">Categoria</th>
                  <th className="py-2.5 px-4">Parcela</th>
                  <th className="py-2.5 px-4 text-right">Valor</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredTransactions.map((t) => {
                  const cardCfg = getPaymentMethodConfig(t.paymentMethod)
                  const isPending = t.status === "PENDING"
                  return (
                    <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                        {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="py-3 px-4 font-medium text-zinc-100">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{t.description}</span>
                          {t.installmentGroupId && (
                            <span
                              title="Compra parcelada"
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-950/40 border border-amber-800/60 text-amber-400"
                            >
                              Parcelado
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border"
                          style={{
                            color: cardCfg.color,
                            backgroundColor: cardCfg.bg,
                            borderColor: cardCfg.border,
                          }}
                        >
                          {cardCfg.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {t.category?.name || "Geral"}
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-300 text-[11px]">
                        {t.totalInstallments && t.totalInstallments > 1 ? (
                          <span className="text-amber-400 font-semibold">
                            {t.installmentNumber || 1}/{t.totalInstallments}
                          </span>
                        ) : (
                          <span className="text-zinc-500">1x (À vista)</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-right font-bold text-[#ef4444] text-xs">
                        {formatBRL(t.amount)}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(t.id)}
                          disabled={loadingActionId === t.id}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all flex items-center gap-1 ${
                            isPending
                              ? "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30 hover:bg-[#f59e0b]/25"
                              : "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30 hover:bg-[#10b981]/25"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              Pendente
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Efetivado
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingTransaction(t)}
                            className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800"
                            title="Editar lançamento"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            disabled={loadingActionId === t.id}
                            onClick={() => handleDelete(t)}
                            className="h-7 w-7 text-zinc-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                            title="Excluir esta parcela"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Add & Edit Dialogs */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onSuccess={() => router.refresh()}
      />

      <EditTransactionDialog
        open={Boolean(editingTransaction)}
        onOpenChange={(op) => !op && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
