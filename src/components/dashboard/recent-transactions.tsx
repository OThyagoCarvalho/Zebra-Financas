"use client"

import { ArrowDownLeft, ArrowUpRight, MessageSquare, Repeat, Trash2, CheckCircle2, Clock, Edit3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { deleteTransactionAction, toggleTransactionStatusAction } from "@/actions/finance-actions"
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog"
import { getPaymentMethodLabel } from "@/lib/payment-methods"
import { useState } from "react"

interface RecentTransactionsProps {
  transactions: any[]
  onUpdate?: () => void
}

export function RecentTransactions({ transactions, onUpdate }: RecentTransactionsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null)

  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente remover esta transação?")) {
      setLoadingId(id)
      await deleteTransactionAction(id)
      setLoadingId(null)
      if (onUpdate) onUpdate()
    }
  }

  const handleToggle = async (id: string) => {
    setLoadingId(id)
    await toggleTransactionStatusAction(id)
    setLoadingId(null)
    if (onUpdate) onUpdate()
  }

  return (
    <Card className="bg-[#121215] border border-zinc-800 rounded-xl">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Últimos Lançamentos
          </CardTitle>
          <CardDescription className="text-[11px] text-zinc-400">
            Transações registradas recentemente via web ou WhatsApp
          </CardDescription>
        </div>
        <Link
          href="/transactions"
          className="text-xs font-medium text-zinc-400 hover:text-white"
        >
          Ver Todas
        </Link>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500">
            Nenhum lançamento registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {transactions.map((t) => {
              const isIncome = t.type === "INCOME"
              const isPending = t.status === "PENDING"

              return (
                <div
                  key={t.id}
                  className="py-2.5 flex items-center justify-between group hover:bg-zinc-900/30 px-1 rounded-md transition-colors"
                >
                  {/* Left: Icon & Description */}
                  <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
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

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {t.description}
                        </span>
                        {t.isRecurring && (
                          <span
                            title="Lançamento Recorrente Mensal"
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950/40 text-blue-400 border border-blue-800/40 flex items-center gap-0.5"
                          >
                            <Repeat className="w-2.5 h-2.5" />
                            Recorrente
                          </span>
                        )}
                        {t.source === "WHATSAPP" && (
                          <span
                            title="Lançado via WhatsApp"
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Zap
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-mono text-zinc-500 mt-0.5 truncate">
                        <span className="truncate">{t.category?.name || "Sem categoria"}</span>
                        <span>•</span>
                        <span className="shrink-0">
                          {new Date(t.dueDate).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                        <span>•</span>
                        <span className="shrink-0">{getPaymentMethodLabel(t.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-mono font-bold ${
                          isIncome ? "text-[#10b981]" : "text-[#ef4444]"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatBRL(t.amount)}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {isPending ? (
                          <span className="text-[#f59e0b]">Pendente</span>
                        ) : (
                          <span className="text-zinc-400">Efetivado</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons: ALWAYS VISIBLE ON MOBILE */}
                    <div className="flex items-center space-x-0.5 sm:space-x-1 opacity-100 transition-opacity shrink-0">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => setEditingTransaction(t)}
                        className="text-zinc-400 hover:text-white h-7 w-7 p-0"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleToggle(t.id)}
                        disabled={loadingId === t.id}
                        className="text-zinc-400 hover:text-white h-7 w-7 p-0"
                        title={isPending ? "Marcar como pago" : "Marcar como pendente"}
                      >
                        {isPending ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 hover:text-[#10b981]" />
                        )}
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                        disabled={loadingId === t.id}
                        className="text-zinc-500 hover:text-[#ef4444] h-7 w-7 p-0"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        onSuccess={() => {
          if (onUpdate) onUpdate()
        }}
      />
    </Card>
  )
}
