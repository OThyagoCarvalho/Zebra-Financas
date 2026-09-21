"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createTransactionAction, getCategoriesAction } from "@/actions/finance-actions"
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, Loader2, Repeat } from "lucide-react"

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
      })

      // Reset form
      setDescription("")
      setAmount("")
      setIsRecurring(false)
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
            Cadastre transações avulsas ou configure custos/receitas recorrentes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Type Selector (Despesa vs Entrada) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-900/90 border border-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => handleTypeChange("EXPENSE")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                type === "EXPENSE"
                  ? "bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-[#ef4444]" />
              <span>Despesa</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange("INCOME")}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all ${
                type === "INCOME"
                  ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-[#10b981]" />
              <span>Entrada</span>
            </button>
          </div>

          {/* Recurrence Mode Selector */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
            <div className="flex items-center gap-2">
              <Repeat className={`w-3.5 h-3.5 ${isRecurring ? "text-[#3b82f6]" : "text-zinc-500"}`} />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-zinc-200">Lançamento Recorrente?</span>
                <span className="text-[10px] text-zinc-500">
                  Repete mensalmente (ex: salário, aluguel)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                isRecurring ? "bg-[#3b82f6] justify-end" : "bg-zinc-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white block shadow-xs" />
            </button>
          </div>

          {/* Amount & Description */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label className="text-xs font-medium text-zinc-300">Valor (R$)</Label>
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
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
                <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  {availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs focus:bg-zinc-800">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-zinc-300">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "PIX")}>
                <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                  <SelectItem value="CREDIT_CARD" className="text-xs">Cartão de Crédito</SelectItem>
                  <SelectItem value="DEBIT" className="text-xs">Cartão de Débito</SelectItem>
                  <SelectItem value="CASH" className="text-xs">Dinheiro em Espécie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <Select value={status} onValueChange={(val) => setStatus(val || "COMPLETED")}>
                <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800 text-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="COMPLETED" className="text-xs">
                    {type === "EXPENSE" ? "Pago / Efetivado" : "Recebido"}
                  </SelectItem>
                  <SelectItem value="PENDING" className="text-xs">Pendente</SelectItem>
                </SelectContent>
              </Select>
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
