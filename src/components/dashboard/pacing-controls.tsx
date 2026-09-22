"use client"

import { CalendarDays, Clock, Filter, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CycleSettingsDialog } from "@/components/layout/cycle-settings-dialog"

interface PacingControlsProps {
  cutoffDay: number
  totalDaysInMonth: number
  onCutoffChange: (day: number) => void
  currentMonthName: string
  cycleStartDay?: number
  cycleLabel?: string
}

export function PacingControls({
  cutoffDay,
  totalDaysInMonth,
  onCutoffChange,
  currentMonthName,
  cycleStartDay = 1,
  cycleLabel,
}: PacingControlsProps) {
  const percentOfMonth = Math.round((cutoffDay / totalDaysInMonth) * 100)

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Label and Month info */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
          <Clock className="w-4 h-4 text-zinc-300" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
              Análise Temporal do Ciclo
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {currentMonthName}
            </span>
            <CycleSettingsDialog currentCycleStartDay={cycleStartDay} cycleLabel={cycleLabel} />
          </div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {cycleLabel ? (
              <span>
                Ciclo: <strong className="text-zinc-200">{cycleLabel}</strong> • Pacing até o{" "}
                <strong className="text-zinc-200">dia {cutoffDay}</strong> de {totalDaysInMonth} (
                {percentOfMonth}% transcorrido)
              </span>
            ) : (
              <span>
                Gastos e receitas contabilizados até o{" "}
                <strong className="text-zinc-200">dia {cutoffDay}</strong> de {totalDaysInMonth} (
                {percentOfMonth}% do mês transcorrido)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Quick Day Selectors & Slider */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
          <button
            onClick={() => onCutoffChange(Math.min(5, totalDaysInMonth))}
            className={`px-2 py-1 text-[11px] font-mono rounded ${
              cutoffDay === 5 ? "bg-zinc-700 text-white font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Dia 5
          </button>
          <button
            onClick={() => onCutoffChange(Math.min(15, totalDaysInMonth))}
            className={`px-2 py-1 text-[11px] font-mono rounded ${
              cutoffDay === 15 ? "bg-zinc-700 text-white font-bold" : "text-zinc-400 hover:text-white"
            }`}
          >
            Dia 15
          </button>
          <button
            onClick={() => onCutoffChange(Math.min(new Date().getDate(), totalDaysInMonth))}
            className={`px-2 py-1 text-[11px] font-mono rounded ${
              cutoffDay === new Date().getDate()
                ? "bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/40 font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Hoje ({new Date().getDate()})
          </button>
          <button
            onClick={() => onCutoffChange(totalDaysInMonth)}
            className={`px-2 py-1 text-[11px] font-mono rounded ${
              cutoffDay === totalDaysInMonth
                ? "bg-zinc-700 text-white font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Mês Todo ({totalDaysInMonth})
          </button>
        </div>

        {/* Input slider */}
        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500">Dia:</span>
          <input
            type="range"
            min={1}
            max={totalDaysInMonth}
            value={cutoffDay}
            onChange={(e) => onCutoffChange(Number(e.target.value))}
            className="w-24 accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono font-bold text-white min-w-5">
            {cutoffDay}
          </span>
        </div>
      </div>
    </div>
  )
}
