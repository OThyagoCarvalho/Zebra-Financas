"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  HelpCircle,
  Copy,
  Check,
  CreditCard,
  Wallet,
  Calendar,
  ArrowUpRight,
  Repeat,
  Sparkles,
  Layers,
  MessageSquare,
  Tag,
  ChevronRight,
} from "lucide-react"
import { getHelpGuideAction } from "@/actions/finance-actions"
import { HelpGroup } from "@/lib/help-content"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectPrompt?: (prompt: string) => void
}

export function HelpDialog({ open, onOpenChange, onSelectPrompt }: HelpDialogProps) {
  const [loading, setLoading] = useState(false)
  const [helpData, setHelpData] = useState<{
    rawText: string
    expenseCategories: any[]
    incomeCategories: any[]
    exampleGroups: HelpGroup[]
  } | null>(null)

  const [activeTab, setActiveTab] = useState<string>("cartoes")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copiedFull, setCopiedFull] = useState(false)

  useEffect(() => {
    if (open && !helpData) {
      setLoading(true)
      getHelpGuideAction()
        .then((data) => setHelpData(data))
        .catch((err) => console.error("Erro ao carregar guia de ajuda:", err))
        .finally(() => setLoading(false))
    }
  }, [open, helpData])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCopyFull = () => {
    if (!helpData?.rawText) return
    navigator.clipboard.writeText(helpData.rawText)
    setCopiedFull(true)
    setTimeout(() => setCopiedFull(false), 2500)
  }

  const getGroupIcon = (iconName: string) => {
    switch (iconName) {
      case "CreditCard":
        return <CreditCard className="w-4 h-4" />
      case "Wallet":
        return <Wallet className="w-4 h-4" />
      case "Calendar":
        return <Calendar className="w-4 h-4" />
      case "ArrowUpRight":
        return <ArrowUpRight className="w-4 h-4" />
      case "Repeat":
        return <Repeat className="w-4 h-4" />
      default:
        return <Sparkles className="w-4 h-4" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#0e0e11] border-zinc-800 text-zinc-100">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800/80 bg-zinc-900/50">
          <DialogHeader className="space-y-1 text-left w-full">
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center font-bold shadow-md shrink-0">
                  <HelpCircle className="w-5 h-5 text-black" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>Central de Ajuda & Exemplos</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-semibold shrink-0">
                      WhatsApp Bot
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                    Envie no WhatsApp iniciando com <strong className="text-white">#</strong>,{" "}
                    <strong className="text-white">$</strong>, <strong className="text-white">!</strong> ou{" "}
                    <strong className="text-white">z</strong> para registrar automaticamente.
                  </DialogDescription>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyFull}
                className="hidden sm:flex items-center gap-1.5 text-xs border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0"
              >
                {copiedFull ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copiar Guia WhatsApp</span>
                  </>
                )}
              </Button>
            </div>
          </DialogHeader>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Categories Grid from DB */}
          <div className="bg-[#141418] border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                Categorias Cadastradas no Cofre
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Identificação automática por texto
              </span>
            </div>

            {loading ? (
              <div className="text-xs text-zinc-500 font-mono py-2">Carregando categorias...</div>
            ) : (
              <div className="space-y-3 text-xs">
                {/* Expenses */}
                <div>
                  <div className="text-[11px] font-mono text-[#ef4444] mb-1.5 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                    Despesas:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {helpData?.expenseCategories.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-md text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Incomes */}
                <div>
                  <div className="text-[11px] font-mono text-[#10b981] mb-1.5 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    Receitas:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {helpData?.incomeCategories.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-md text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs for Example Groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Exemplos Práticos por Tipo de Cadastro
              </h3>
              <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
                Clique para copiar ou testar
              </span>
            </div>

            {/* Tabs Header */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {helpData?.exampleGroups.map((grp) => (
                <button
                  key={grp.id}
                  onClick={() => setActiveTab(grp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                    activeTab === grp.id
                      ? "bg-white text-black font-semibold shadow-sm"
                      : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800/80"
                  }`}
                >
                  {getGroupIcon(grp.icon)}
                  <span>{grp.title}</span>
                </button>
              ))}
            </div>

            {/* Active Group Details & Examples */}
            {(() => {
              const currentGroup = helpData?.exampleGroups.find((g) => g.id === activeTab) || helpData?.exampleGroups[0]
              if (!currentGroup) return null

              return (
                <div className="mt-3 bg-[#121216] border border-zinc-800/90 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-zinc-800/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                          {getGroupIcon(currentGroup.icon)}
                          {currentGroup.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${currentGroup.badgeColor}`}
                        >
                          {currentGroup.badge}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {currentGroup.description}
                      </p>
                    </div>
                  </div>

                  {/* Examples List */}
                  <div className="grid grid-cols-1 gap-3">
                    {currentGroup.examples.map((ex, idx) => {
                      const itemKey = `${currentGroup.id}-${idx}`
                      const isCopied = copiedId === itemKey

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-200">
                                {ex.title}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                {ex.category}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded select-all">
                                {ex.command}
                              </code>
                            </div>

                            <p className="text-[11px] text-zinc-400">
                              {ex.explanation}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {onSelectPrompt && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  onSelectPrompt(ex.command)
                                  onOpenChange(false)
                                }}
                                className="h-7 text-[11px] border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                              >
                                Testar
                              </Button>
                            )}
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => handleCopy(ex.command, itemKey)}
                              className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800"
                              title="Copiar comando"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span>{isCopied ? "Copiado!" : "Copiar"}</span>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Tips Box */}
          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-800/40 text-xs text-blue-300 space-y-1.5">
            <div className="font-semibold text-white flex items-center gap-1.5">
              💡 Dica para Lançamentos Rápidos
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              O bot entende valores redondos como <code className="text-zinc-200 font-mono"># uber 20</code> ou centavos como <code className="text-zinc-200 font-mono"># cafe 4,50</code>. Para compras parceladas, basta informar a quantidade de vezes (ex: <code className="text-zinc-200 font-mono">10x xp</code> ou <code className="text-zinc-200 font-mono">em 6 vezes bb</code>) e o sistema projeta cada parcela nos meses subsequentes automaticamente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyFull}
            className="sm:hidden flex items-center gap-1.5 text-xs border-zinc-700 text-zinc-200"
          >
            {copiedFull ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFull ? "Copiado!" : "Copiar Guia"}</span>
          </Button>

          <div className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            Envie <strong># ajuda</strong> para si mesmo no WhatsApp para ver este guia a qualquer hora.
          </div>

          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold px-4 ml-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
