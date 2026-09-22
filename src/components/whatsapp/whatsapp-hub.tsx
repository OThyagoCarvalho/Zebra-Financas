"use client"

import { useState } from "react"
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Info,
  Key,
  Loader2,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  HelpCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { processWhatsAppMessageAction, updateWhatsAppConfigAction } from "@/actions/finance-actions"
import { HelpDialog } from "@/components/help/help-dialog"
import { useRouter } from "next/navigation"

interface WhatsAppHubProps {
  initialConfig: any
  initialLogs: any[]
}

export function WhatsAppHub({ initialConfig, initialLogs }: WhatsAppHubProps) {
  const router = useRouter()
  const [logs, setLogs] = useState(initialLogs)
  const [config, setConfig] = useState(initialConfig)
  const [phoneInput, setPhoneInput] = useState(initialConfig?.authorizedPhone || "5511999999999")
  const [savingConfig, setSavingConfig] = useState(false)
  const [copied, setCopied] = useState(false)

  // Simulator state
  const [chatInput, setChatInput] = useState("")
  const [sending, setSending] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<
    { sender: "user" | "bot"; text: string; time: string }[]
  >([
    {
      sender: "bot",
      text: "👋 Olá! Sou o assistente financeiro do ZEBRA. Você pode me mandar qualquer lançamento iniciando com #, $, ! ou z, ou digite \"# ajuda\" para ver todas as categorias e comandos:\n\n• \"# almoço 45 débito\"\n• \"# mercado 180 pix\"\n• \"# celular 1500 10x xp\"\n• \"# farmacia 85 credito bb\"\n• \"# salario 6500\"\n• \"# aluguel 2200 mensal\"",
      time: "Agora",
    },
  ])

  const quickSamples = [
    "# ajuda",
    "# almoço 45 débito",
    "# mercado 180 pix",
    "# farmacia 85 credito bb",
    "# celular 1500 10x xp",
    "# salario 6500",
    "# aluguel 2200 mensal",
  ]

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim()
    if (!text || sending) return

    const nowTime = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Append user message
    setChatMessages((prev) => [...prev, { sender: "user", text, time: nowTime }])
    setChatInput("")
    setSending(true)

    try {
      const res = await processWhatsAppMessageAction(phoneInput, text)
      const botReply =
        res.replyMessage ||
        (res.success
          ? "✅ Lançamento registrado com sucesso!"
          : "⚠️ Não entendi os dados da mensagem.")

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: botReply,
          time: new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ])

      router.refresh()
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `❌ Erro ao processar mensagem: ${err.message || "Erro desconhecido"}`,
          time: nowTime,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const res = await updateWhatsAppConfigAction({
        authorizedPhone: phoneInput,
        provider: config.provider || "SIMULATOR",
        isActive: true,
      })
      if (res.success) {
        setConfig(res.config)
        alert("Configurações do WhatsApp salvas com sucesso!")
      }
    } finally {
      setSavingConfig(false)
    }
  }

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/webhook/whatsapp`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Integração & Bot WhatsApp</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Lance despesas e receitas instantaneamente enviando mensagens pelo WhatsApp com inteligência de linguagem natural
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive WhatsApp Simulator */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[640px]">
            {/* WhatsApp Phone Mock Header */}
            <div className="bg-[#18181b] border-b border-zinc-800 p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs shadow-sm">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                    <span>ZEBRA Finance Bot</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    +55 (11) 99999-9999 • Online
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setHelpOpen(true)}
                  className="h-7 text-[11px] border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-amber-300 flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 text-amber-400" />
                  <span>Guia & Ajuda</span>
                </Button>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Simulador Ativo
                </div>
              </div>
            </div>

            {/* Chat Timeline */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0d0d10] font-sans">
              {chatMessages.map((msg, idx) => {
                const isUser = msg.sender === "user"
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-zinc-100 text-black rounded-tr-none font-medium"
                          : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none font-mono text-[11px]"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500 px-1 mt-0.5">
                      {msg.time}
                    </span>
                  </div>
                )
              })}

              {sending && (
                <div className="flex items-center space-x-2 text-zinc-500 text-xs font-mono p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>ZEBRA está processando seu lançamento...</span>
                </div>
              )}
            </div>

            {/* Quick Sample Chips */}
            <div className="p-2 bg-zinc-900/60 border-t border-zinc-800/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
              <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap pl-1">
                Sugestões:
              </span>
              {quickSamples.map((sample, i) => {
                const isHelp = sample.includes("ajuda")
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(sample)}
                    disabled={sending}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors ${
                      isHelp
                        ? "bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-700/60 font-semibold"
                        : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                    }`}
                  >
                    {sample}
                  </button>
                )
              })}
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-[#18181b] border-t border-zinc-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Ex: Almoço 45 débito, ou Salário 7000..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={sending}
                  className="h-10 text-xs bg-zinc-900 border-zinc-700 text-white focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
                <Button
                  type="submit"
                  disabled={sending || !chatInput.trim()}
                  className="bg-white text-black hover:bg-zinc-200 h-10 px-4 rounded-md font-semibold"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right 5 Cols: Webhook Config & Real WhatsApp Setup */}
        <div className="lg:col-span-5 space-y-4">
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="w-full bg-zinc-900 border border-zinc-800 h-9 p-1">
              <TabsTrigger value="setup" className="text-xs flex-1">
                Conectar WhatsApp Real
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs flex-1">
                Logs de Mensagens
              </TabsTrigger>
            </TabsList>

            {/* Tab: Real Connection Instructions */}
            <TabsContent value="setup" className="space-y-4 mt-3">
              <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    URL do Webhook do Servidor
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Insira este endereço no painel da Evolution API, Z-API ou Meta Cloud para receber as mensagens automaticamente.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      typeof window !== "undefined"
                        ? `${window.location.origin}/api/webhook/whatsapp`
                        : "http://localhost:3000/api/webhook/whatsapp"
                    }
                    className="h-8 text-xs font-mono bg-zinc-900 border-zinc-700 text-zinc-300"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyWebhookUrl}
                    className="h-8 px-2.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                {/* Whitelist Security Setting */}
                <form onSubmit={handleSaveConfig} className="pt-3 border-t border-zinc-800/80 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Número Autorizado (Whitelist)</span>
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Apenas mensagens deste número conseguirão realizar lançamentos.
                    </p>
                    <Input
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ex: 5511999999999"
                      className="mt-1.5 h-8 text-xs font-mono bg-zinc-900 border-zinc-700 text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingConfig}
                    className="w-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8"
                  >
                    Salvar Configurações
                  </Button>
                </form>
              </Card>

              <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-zinc-300" />
                  <h3 className="text-xs font-semibold text-white">Como Usar com Seu WhatsApp</h3>
                </div>

                <div className="space-y-2 text-[11px] text-zinc-400 leading-relaxed font-mono">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-zinc-200 font-sans block">Opção 1: Evolution API (Recomendada)</strong>
                    Rode o container da Evolution API (gratuito) e leia o QR Code com o WhatsApp no seu celular. Configure o Webhook acima apontando para o ZEBRA.
                  </div>

                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <strong className="text-zinc-200 font-sans block">Opção 2: Simulador Imediato</strong>
                    Você pode usar o chat ao lado no próprio navegador para lançar suas despesas com toda a IA e automação sem precisar de servidores externos!
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Message Logs */}
            <TabsContent value="logs" className="mt-3">
              <Card className="bg-[#121215] border border-zinc-800 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Histórico de Mensagens
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.refresh()}
                    className="h-7 text-xs text-zinc-400 hover:text-white"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Atualizar
                  </Button>
                </div>

                <div className="max-h-[480px] overflow-y-auto space-y-2">
                  {logs.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-zinc-500">
                      Nenhum registro de webhook ainda.
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-400">{log.senderPhone}</span>
                          <span
                            className={
                              log.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {log.status}
                          </span>
                        </div>
                        <div className="text-zinc-200 text-[11px]">{log.rawMessage}</div>
                        <div className="text-zinc-500 text-[9px]">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Help Dialog */}
      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        onSelectPrompt={(prompt) => {
          setChatInput(prompt)
        }}
      />
    </div>
  )
}
