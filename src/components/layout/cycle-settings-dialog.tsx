"use client"

import { useState } from "react"
import { CalendarRange, Check, Loader2, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { setCycleStartDayAction } from "@/actions/finance-actions"
import { useRouter } from "next/navigation"

interface CycleSettingsDialogProps {
  currentCycleStartDay?: number
  cycleLabel?: string
}

const PRESETS = [
  { day: 1, label: "Dia 01 (Calendário Tradicional)" },
  { day: 5, label: "Dia 05 (5º dia útil / Pagamento)" },
  { day: 10, label: "Dia 10" },
  { day: 15, label: "Dia 15 (Quinzena)" },
  { day: 20, label: "Dia 20" },
  { day: 25, label: "Dia 25" },
]

export function CycleSettingsDialog({
  currentCycleStartDay = 1,
  cycleLabel,
}: CycleSettingsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(String(currentCycleStartDay || 1))
  const [loading, setLoading] = useState(false)

  const handleSave = async (dayToSave?: number) => {
    const day = dayToSave !== undefined ? dayToSave : parseInt(selectedDay, 10)
    if (isNaN(day) || day < 1 || day > 28) return

    setLoading(true)
    try {
      await setCycleStartDayAction(day)
      setOpen(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const numericDay = parseInt(selectedDay, 10) || 1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ajustar o dia de início do seu ciclo mensal (data de pagamento)"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-[#121215] text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-mono transition-colors"
      >
        <CalendarRange className="w-3.5 h-3.5 text-zinc-400" />
        <span>Ciclo: Dia {String(currentCycleStartDay || 1).padStart(2, "0")}</span>
        {cycleLabel && (
          <span className="hidden sm:inline text-zinc-500 text-[10px]">({cycleLabel})</span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#121215] border border-zinc-800 text-zinc-100 sm:max-w-[420px] p-6 shadow-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-emerald-400" />
              <span>Início do Ciclo Financeiro</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Escolha o dia em que o seu mês financeiro começa (ex: dia em que você recebe seu salário). O Zebra contará 1 ciclo mensal a partir desta data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Quick Presets */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-2">
                Atalhos Rápidos
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESETS.map((p) => {
                  const isSelected = numericDay === p.day
                  return (
                    <button
                      key={p.day}
                      type="button"
                      onClick={() => setSelectedDay(String(p.day))}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-300 font-semibold"
                          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom Day Input */}
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1">
                Ou digite um dia específico (1 a 28)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">
                  Dia
                </span>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="pl-12 bg-zinc-900 border-zinc-800 text-white font-mono text-sm"
                  placeholder="Ex: 5"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {numericDay === 1
                  ? "Ciclo tradicional: do dia 01 ao último dia do mês."
                  : `Seu mês financeiro começará no dia ${String(numericDay).padStart(2, "0")} e encerrará no dia ${String(numericDay - 1).padStart(2, "0")} do mês seguinte.`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading || isNaN(numericDay) || numericDay < 1 || numericDay > 28}
                onClick={() => handleSave()}
                className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8 px-4"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                <span>Salvar Ciclo</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
