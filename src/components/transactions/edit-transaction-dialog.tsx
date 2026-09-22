"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { updateTransactionAction, getCategoriesAction, cancelRecurringTransactionAction } from "@/actions/finance-actions"
import { PAYMENT_METHODS } from "@/lib/payment-methods"
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, CreditCard, Loader2, Repeat, Ban } from "lucide-react"

interface EditTransactionDialogProps {
  transaction: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (updated: any) => void
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}: EditTransactionDialogProps) {
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [isRecurring, setIsRecurring] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("PIX")
  const [dueDate, setDueDate] = useState("")
  const [status, setStatus] = useState("COMPLETED")

  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingCats, setFetchingCats] = useState(false)

  // Populate fields when transaction is provided
  useEffect(() => {
    if (transaction && open) {
      setType(transaction.type as "EXPENSE" | "INCOME")
      setIsRecurring(Boolean(transaction.isRecurring))
      setDescription(transaction.description || "")
      setAmount(String(transaction.amount || ""))
      setCategoryId(transaction.categoryId || "")
      setPaymentMethod(transaction.paymentMethod || "PIX")
      setStatus(transaction.status || "COMPLETED")

      if (transaction.dueDate) {
        const d = new Date(transaction.dueDate)
        setDueDate(d.toISOString().split("T")[0])
      } else {
        setDueDate(new Date().toISOString().split("T")[0])
      }

      setFetchingCats(true)
      getCategoriesAction()
        .then((cats) => {
          setCategories(cats)
        })
        .finally(() => setFetchingCats(false))
    }
  }, [transaction, open])

  const handleTypeChange = (newType: string) => {
    const t = newType as "EXPENSE" | "INCOME"
    setType(t)
    const matching = categories.filter((c) => c.type === t)
    if (matching.length > 0 && !matching.some((c) => c.id === categoryId)) {
      setCategoryId(matching[0].id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transaction || !description || !amount || !categoryId) return

    setLoading(true)
    try {
      const res = await updateTransactionAction(transaction.id, {
        description,
        amount: parseFloat(amount.replace(",", ".")),
        type,
        isRecurring,
        categoryId,
        dueDate,
        paymentMethod,
        status,
      })

      onOpenChange(false)
      if (onSuccess && res.transaction) {
        onSuccess(res.transaction)
      }
    } catch (err) {
      console.error("Failed to update transaction", err)
    } finally {
      setLoading(false)
    }
  }

  const [cancelLoading, setCancelLoading] = useState(false)

  const handleCancelRecurring = async () => {
    if (!transaction?.id) return
    if (!confirm("Deseja realmente cancelar esta recorrência e todos os lançamentos futuros dela?")) return
    setCancelLoading(true)
    try {
      const res = await cancelRecurringTransactionAction(transaction.id)
      if (res.success) {
        setStatus("CANCELED")
        if (onSuccess) {
          onSuccess({ ...transaction, status: "CANCELED" })
        }
        onOpenChange(false)
      }
    } catch (err) {
      console.error("Failed to cancel recurring transaction", err)
    } finally {
      setCancelLoading(false)
    }
  }

  const availableCategories = categories.filter((c) => c.type === type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121215] border border-zinc-800 text-zinc-100 sm:max-w-[460px] p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              Editar Lançamento
              {status === "CANCELED" && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Cancelada
                </span>
              )}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Altere os detalhes da transação financeira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Income vs Expense Tabs */}
          <Tabs
            value={type}
            onValueChange={handleTypeChange}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 w-full bg-zinc-900 border border-zinc-800 p-0.5">
              <TabsTrigger
                value="EXPENSE"
                className="data-[state=active]:bg-[#ef4444]/20 data-[state=active]:text-[#ef4444] text-xs font-semibold gap-1.5 transition-all"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Despesa</span>
              </TabsTrigger>
              <TabsTrigger
                value="INCOME"
                className="data-[state=active]:bg-[#10b981]/20 data-[state=active]:text-[#10b981] text-xs font-semibold gap-1.5 transition-all"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Entrada</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount input */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400 font-medium">Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">
                R$
              </span>
              <Input
                type="text"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 text-white font-mono text-base font-semibold tracking-tight focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400 font-medium">Descrição</Label>
            <Input
              type="text"
              required
              placeholder="Ex: Aluguel, Almoço, Salário"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs focus-visible:ring-1 focus-visible:ring-zinc-400"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400 font-medium">Categoria</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-9"
            >
              {availableCategories.length === 0 ? (
                <option value="" disabled>Carregando categorias...</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#121215] text-zinc-200">
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 font-medium">Vencimento</Label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-400 font-medium">Forma de Pagamento</Label>
                {transaction?.totalInstallments && transaction?.totalInstallments > 1 && (
                  <span className="text-[10px] font-mono text-amber-400 font-medium">
                    Parcela {transaction.installmentNumber || 1}/{transaction.totalInstallments}
                  </span>
                )}
              </div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-9"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#121215] text-zinc-200">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence & Status */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`flex items-center space-x-2 text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                isRecurring
                  ? "border-blue-500/40 bg-blue-950/20 text-blue-400"
                  : "border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <Repeat className={`w-3.5 h-3.5 ${isRecurring ? "text-blue-400" : "text-zinc-500"}`} />
              <span>Recorrente Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (status === "COMPLETED") setStatus("PENDING")
                else if (status === "PENDING") setStatus("COMPLETED")
                else setStatus("COMPLETED")
              }}
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-all ${
                status === "COMPLETED"
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400"
                  : status === "CANCELED"
                  ? "border-zinc-700 bg-zinc-900 text-zinc-400"
                  : "border-amber-500/40 bg-amber-950/20 text-amber-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "COMPLETED"
                    ? "bg-emerald-400"
                    : status === "CANCELED"
                    ? "bg-zinc-500"
                    : "bg-amber-400"
                }`}
              />
              <span>
                {status === "COMPLETED"
                  ? "Efetivado"
                  : status === "CANCELED"
                  ? "Cancelada"
                  : "Pendente"}
              </span>
            </button>
          </div>

          {/* Recurring Cancel Alert / Action */}
          {transaction?.isRecurring && status !== "CANCELED" && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-red-950/60 bg-red-950/15">
              <div className="text-[11px] text-zinc-400">
                Lançamento recorrente ativo no sistema.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelRecurring}
                disabled={cancelLoading}
                className="h-7 text-xs border-red-900/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 hover:text-white gap-1 px-2.5"
              >
                {cancelLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Ban className="w-3 h-3 text-red-400" />
                )}
                <span>Cancelar Recorrência</span>
              </Button>
            </div>
          )}

          {status === "CANCELED" && (
            <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[11px] text-zinc-400 flex items-center gap-2">
              <Ban className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>Esta recorrência foi cancelada e não afetará faturas ou projeções futuras.</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !description || !amount}
              className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold px-4"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
