"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createTransactionAction, getCategoriesAction } from "@/actions/finance-actions"
import { PAYMENT_METHODS, isCreditCard } from "@/lib/payment-methods"
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, CreditCard, Loader2, Repeat, Sparkles } from "lucide-react"

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickAddDialog({ open, onOpenChange, onSuccess }: QuickAddDialogProps) {
  const [type, setType] = useState<"EXPENSE" | "INCOME">("EXPENSE")
  const [isRecurring, setIsRecurring] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("PIX")
  const [installments, setInstallments] = useState(1)
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0])
  const [status, setStatus] = useState("COMPLETED")

  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingCats, setFetchingCats] = useState(false)

  useEffect(() => {
    if (open) {
      setFetchingCats(true)
      getCategoriesAction()
        .then((cats) => {
          setCategories(cats)
          const filtered = cats.filter((c) => c.type === type)
          if (filtered.length > 0 && !categoryId) {
            setCategoryId(filtered[0].id)
          }
        })
        .finally(() => setFetchingCats(false))
    }
  }, [open, type])

  // When type changes, select the first matching category
  const handleTypeChange = (newType: string) => {
    const t = newType as "EXPENSE" | "INCOME"
    setType(t)
    const matching = categories.filter((c) => c.type === t)
    if (matching.length > 0) {
      setCategoryId(matching[0].id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || !categoryId) return

    setLoading(true)
    try {
      await createTransactionAction({
        description,
        amount: parseFloat(amount.replace(",", ".")),
        type,
        isRecurring,
        categoryId,
        dueDate,
        paymentMethod,
        status,
        installments: isCreditCard(paymentMethod) && type === "EXPENSE" ? installments : 1,
      })

      // Reset form
      setDescription("")
      setAmount("")
      setIsRecurring(false)
      setInstallments(1)
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error("Failed to create transaction", err)
    } finally {
      setLoading(false)
    }
  }

  const availableCategories = categories.filter((c) => c.type === type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121215] border border-zinc-800 text-zinc-100 sm:max-w-[440px] p-6 shadow-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
            <span>Novo Lançamento</span>
            <span className="text-[11px] font-mono text-zinc-500 font-normal">
              (Entrada / Despesa)
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Preencha os dados do lançamento financeiro.
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

          {/* Amount & Description */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-zinc-300">Valor</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">
                  R$
                </span>
                <Input
                  type="text"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 bg-zinc-900 border-zinc-800 text-white font-mono text-base font-semibold focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium text-zinc-300">Descrição</Label>
              <Input
                required
                placeholder="Ex: Supermercado Pão de Açúcar"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-800 text-white text-xs focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-zinc-300">Categoria</Label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-9"
              >
                {availableCategories.length === 0 ? (
                  <option value="" disabled>Carregando categorias...</option>
                ) : (
                  availableCategories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#121215] text-white">
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label className="text-xs font-medium text-zinc-300">Forma de Pagamento</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-9 font-medium"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#121215] text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurrence Toggle */}
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                <Repeat className={`w-4 h-4 mt-0.5 shrink-0 ${isRecurring ? "text-blue-400" : "text-zinc-500"}`} />
                <div className="min-w-0">
                  <div
                    onClick={() => {
                      const next = !isRecurring
                      setIsRecurring(next)
                      if (next) setInstallments(1)
                    }}
                    className="text-xs font-semibold text-zinc-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Lançamento Recorrente Mensal</span>
                    {isRecurring && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/60 text-blue-400 border border-blue-800/60">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {isCreditCard(paymentMethod)
                      ? "Cobrança mensal na fatura deste cartão (ex: Netflix, streaming, academia) projetada nos próximos meses até cancelamento."
                      : "Repete todo mês automaticamente no orçamento (ex: aluguel, salário, assinatura)."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = !isRecurring
                  setIsRecurring(next)
                  if (next) setInstallments(1)
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isRecurring ? "bg-blue-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isRecurring ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Installments for Credit Cards (shown when not a recurring subscription) */}
          {isCreditCard(paymentMethod) && type === "EXPENSE" && !isRecurring && (
            <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Parcelamento no Cartão</span>
                </Label>
                {installments > 1 && (
                  <span className="text-[11px] font-mono text-amber-400 font-semibold">
                    {installments}x de R${" "}
                    {((parseFloat(amount.replace(",", ".")) || 0) / installments).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>

              <select
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#121215] border border-zinc-800 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono h-9"
              >
                <option value={1} className="bg-[#121215] text-white">1x à vista</option>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => (
                  <option key={num} value={num} className="bg-[#121215] text-white">
                    {num}x {amount ? `de R$ ${((parseFloat(amount.replace(",", ".")) || 0) / num).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}
                  </option>
                ))}
              </select>

              {installments > 1 && (
                <p className="text-[11px] text-zinc-400">
                  As parcelas 2 a {installments} serão projetadas nos meses subsequentes e computadas no orçamento da categoria.
                </p>
              )}
            </div>
          )}

          {/* Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-zinc-300">Data de Vencimento</Label>
              <Input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-800 text-white text-xs h-9 font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-zinc-300">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 text-white rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 h-9 font-medium"
              >
                <option value="COMPLETED" className="bg-[#121215] text-white">
                  {type === "EXPENSE" ? "Pago / Efetivado" : "Recebido"}
                </option>
                <option value="PENDING" className="bg-[#121215] text-white">
                  Pendente
                </option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !amount || !description}
              className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8 px-4"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              <span>Salvar Lançamento</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
